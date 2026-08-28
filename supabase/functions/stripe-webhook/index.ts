import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@13.6.0?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', { apiVersion: '2023-10-16' });
const cryptoProvider = Stripe.createSubtleCryptoProvider();

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

serve(async (request) => {
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  if (Deno.env.get('STRIPE_PAYMENTS_ENABLED') !== 'true') {
    return json({ error: 'Online payments are not enabled for this deployment.' }, 503);
  }

  const signature = request.headers.get('Stripe-Signature');
  if (!signature) return json({ error: 'Missing Stripe signature' }, 400);
  const secret = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '';
  if (!secret) return json({ error: 'Webhook secret is not configured' }, 503);

  const rawBody = await request.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(rawBody, signature, secret, undefined, cryptoProvider);
  } catch (error) {
    console.error('Stripe signature verification failed', error);
    return json({ error: 'Invalid Stripe signature' }, 400);
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  const { error: claimError } = await supabase.from('stripe_webhook_events').insert({
    event_id: event.id,
    event_type: event.type,
    status: 'processing',
  });
  if (claimError?.code === '23505') return json({ received: true, duplicate: true });
  if (claimError) return json({ error: 'Unable to claim webhook event' }, 500);

  try {
    switch (event.type) {
      case 'customer.created': {
        const customer = event.data.object as Stripe.Customer;
        if (customer.email) {
          const { error } = await supabase.from('billing')
            .update({ stripe_customer_id: customer.id, updated_at: new Date().toISOString() })
            .eq('billing_email', customer.email);
          if (error) throw error;
        }
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const { error } = await supabase.from('billing').update({
          subscription_id: subscription.id,
          subscription_status: subscription.status,
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          plan_id: subscription.items.data[0]?.price?.id ?? null,
          updated_at: new Date().toISOString(),
        }).eq('stripe_customer_id', String(subscription.customer));
        if (error) throw error;
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const { error } = await supabase.from('billing').update({
          subscription_status: 'canceled', updated_at: new Date().toISOString(),
        }).eq('subscription_id', subscription.id);
        if (error) throw error;
        break;
      }
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        const { data: billing, error: billingError } = await supabase.from('billing')
          .select('id,user_id').eq('stripe_customer_id', String(invoice.customer)).maybeSingle();
        if (billingError) throw billingError;
        if (!billing) throw new Error('No authoritative billing record for Stripe customer');
        const paymentIntentId = typeof invoice.payment_intent === 'string' ? invoice.payment_intent : invoice.payment_intent?.id;
        if (!paymentIntentId) throw new Error('Paid invoice has no payment intent id');
        const { error } = await supabase.from('payments').upsert({
          user_id: billing.user_id,
          billing_id: billing.id,
          stripe_payment_intent_id: paymentIntentId,
          stripe_invoice_id: invoice.id,
          amount: invoice.amount_paid,
          currency: invoice.currency,
          status: 'succeeded',
          description: invoice.description || 'Stripe invoice payment',
          receipt_url: invoice.hosted_invoice_url,
          metadata: { stripe_event_id: event.id },
          updated_at: new Date().toISOString(),
        }, { onConflict: 'stripe_payment_intent_id' });
        if (error) throw error;
        // Deliberately no automatic enrollment. Payment receipt does not prove the
        // charge/program/course entitlement until the bursar ledger reconciles it.
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const { data: billing, error: billingError } = await supabase.from('billing')
          .select('id,user_id').eq('stripe_customer_id', String(invoice.customer)).maybeSingle();
        if (billingError) throw billingError;
        if (billing) {
          const paymentIntentId = typeof invoice.payment_intent === 'string' ? invoice.payment_intent : invoice.payment_intent?.id;
          if (paymentIntentId) {
            const { error } = await supabase.from('payments').upsert({
              user_id: billing.user_id,
              billing_id: billing.id,
              stripe_payment_intent_id: paymentIntentId,
              stripe_invoice_id: invoice.id,
              amount: invoice.amount_due,
              currency: invoice.currency,
              status: 'failed',
              description: 'Stripe payment failed',
              failure_reason: 'Provider reported payment failure',
              metadata: { stripe_event_id: event.id },
              updated_at: new Date().toISOString(),
            }, { onConflict: 'stripe_payment_intent_id' });
            if (error) throw error;
          }
        }
        break;
      }
      case 'payment_intent.succeeded': {
        const intent = event.data.object as Stripe.PaymentIntent;
        const userId = intent.metadata?.user_id;
        const institutionId = intent.metadata?.institution_id;
        if (intent.metadata?.type === 'tuition' && userId && institutionId) {
          const { data: billing, error: billingError } = await supabase.from('billing')
            .select('id,user_id').eq('user_id', userId).eq('institution_id', institutionId).maybeSingle();
          if (billingError) throw billingError;
          if (!billing || billing.user_id !== userId) throw new Error('Tuition payment is not bound to an authoritative billing account');
          const { error } = await supabase.from('payments').upsert({
            user_id: userId,
            billing_id: billing.id,
            stripe_payment_intent_id: intent.id,
            amount: intent.amount_received,
            currency: intent.currency,
            status: 'succeeded',
            description: intent.description || 'Tuition payment received',
            metadata: { stripe_event_id: event.id, reconciliation_required: true },
            updated_at: new Date().toISOString(),
          }, { onConflict: 'stripe_payment_intent_id' });
          if (error) throw error;
        }
        break;
      }
      default:
        console.info(`Stripe event acknowledged without state change: ${event.type}`);
    }

    const { error: doneError } = await supabase.from('stripe_webhook_events').update({
      status: 'processed', processed_at: new Date().toISOString(), updated_at: new Date().toISOString(), last_error: null,
    }).eq('event_id', event.id);
    if (doneError) throw doneError;
    return json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Stripe webhook processing failed', message);
    await supabase.from('stripe_webhook_events').update({
      status: 'failed', last_error: message.slice(0, 1000), updated_at: new Date().toISOString(),
    }).eq('event_id', event.id);
    return json({ error: 'Webhook processing failed' }, 500);
  }
});
