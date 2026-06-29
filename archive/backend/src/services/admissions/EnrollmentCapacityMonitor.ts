import { PrismaClient } from '@prisma/client';
import { logger } from '../../utils/logger';

export interface EnrollmentCapacity {
  id: string;
  programType: string;
  startDate: Date;
  totalCapacity: number;
  currentEnrollment: number;
  confirmedEnrollment: number;
  pendingEnrollment: number;
  waitlistSize: number;
  availableSpots: number;
  utilizationRate: number;
  projectedFinalEnrollment: number;
  lastUpdated: Date;
}

export interface CapacityAlert {
  id: string;
  programType: string;
  startDate: Date;
  alertType: CapacityAlertType;
  threshold: number;
  currentValue: number;
  message: string;
  severity: AlertSeverity;
  createdDate: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedDate?: Date;
}

export interface EnrollmentProjection {
  programType: string;
  startDate: Date;
  currentEnrollment: number;
  projectedEnrollment: number;
  confidenceLevel: number;
  factors: ProjectionFactor[];
  recommendedActions: string[];
}

export interface ProjectionFactor {
  factor: string;
  impact: number;
  confidence: number;
  description: string;
}

export enum CapacityAlertType {
  OVER_CAPACITY = 'over_capacity',
  NEAR_CAPACITY = 'near_capacity',
  UNDER_CAPACITY = 'under_capacity',
  WAITLIST_GROWING = 'waitlist_growing',
  ENROLLMENT_DECLINING = 'enrollment_declining'
}

export enum AlertSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export class EnrollmentCapacityMonitor {
  private prisma: PrismaClient;
  private capacityLimits: Map<string, number> = new Map();
  private alertThresholds: Map<CapacityAlertType, number> = new Map();

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.initializeCapacityLimits();
    this.initializeAlertThresholds();
  }

  private initializeCapacityLimits(): void {
    // Default capacity limits by program type
    this.capacityLimits.set('scroll_theology', 50);
    this.capacityLimits.set('prophetic_law', 30);
    this.capacityLimits.set('edenic_science', 40);
    this.capacityLimits.set('scroll_economy', 35);
    this.capacityLimits.set('geoprophetic_intelligence', 25);
    this.capacityLimits.set('general_studies', 100);
  }

  private initializeAlertThresholds(): void {
    this.alertThresholds.set(CapacityAlertType.NEAR_CAPACITY, 0.85); // 85%
    this.alertThresholds.set(CapacityAlertType.OVER_CAPACITY, 1.0); // 100%
    this.alertThresholds.set(CapacityAlertType.UNDER_CAPACITY, 0.5); // 50%
    this.alertThresholds.set(CapacityAlertType.WAITLIST_GROWING, 10); // 10 students
    this.alertThresholds.set(CapacityAlertType.ENROLLMENT_DECLINING, -0.1); // 10% decline
  }

  async updateCapacityLimit(programType: string, newLimit: number): Promise<void> {
    try {
      logger.info(`Updating capacity limit for ${programType} to ${newLimit}`);
      
      this.capacityLimits.set(programType, newLimit);
      
      // Store in database for persistence
      await this.prisma.applications.updateMany({
        where: { program_applied: programType },
        data: {
          application_data: {
            capacity_limit: newLimit
          }
        }
      });

      // Check for new alerts after capacity change
      await this.checkCapacityAlerts(programType);

      logger.info(`Capacity limit updated for ${programType}`);

    } catch (error) {
      logger.error(`Error updating capacity limit: ${error}`);
      throw error;
    }
  }

  async getCurrentCapacity(programType: string, startDate: Date): Promise<EnrollmentCapacity> {
    try {
      logger.info(`Getting current capacity for ${programType} starting ${startDate.toISOString()}`);

      // Get total capacity
      const totalCapacity = this.capacityLimits.get(programType) || 50;

      // Get enrollment counts
      const enrollmentCounts = await this.getEnrollmentCounts(programType, startDate);
      
      // Get waitlist size
      const waitlistSize = await this.getWaitlistSize(programType, startDate);

      // Calculate metrics
      const availableSpots = Math.max(0, totalCapacity - enrollmentCounts.confirmed);
      const utilizationRate = (enrollmentCounts.confirmed / totalCapacity) * 100;
      
      // Project final enrollment
      const projectedFinalEnrollment = await this.projectFinalEnrollment(
        programType, 
        startDate, 
        enrollmentCounts
      );

      const capacity: EnrollmentCapacity = {
        id: `capacity_${programType}_${startDate.getTime()}`,
        programType,
        startDate,
        totalCapacity,
        currentEnrollment: enrollmentCounts.total,
        confirmedEnrollment: enrollmentCounts.confirmed,
        pendingEnrollment: enrollmentCounts.pending,
        waitlistSize,
        availableSpots,
        utilizationRate,
        projectedFinalEnrollment,
        lastUpdated: new Date()
      };

      logger.info(`Current capacity retrieved for ${programType}: ${enrollmentCounts.confirmed}/${totalCapacity}`);
      return capacity;

    } catch (error) {
      logger.error(`Error getting current capacity: ${error}`);
      throw error;
    }
  }

  async getAllCapacities(): Promise<EnrollmentCapacity[]> {
    try {
      logger.info('Getting all program capacities');

      const capacities: EnrollmentCapacity[] = [];
      
      // Get unique program types and start dates
      const programs = await this.prisma.applications.findMany({
        select: {
          program_applied: true,
          intended_start_date: true
        },
        distinct: ['program_applied', 'intended_start_date']
      });

      // Get capacity for each program/date combination
      for (const program of programs) {
        const capacity = await this.getCurrentCapacity(
          program.program_applied,
          program.intended_start_date
        );
        capacities.push(capacity);
      }

      logger.info(`Retrieved capacities for ${capacities.length} program cohorts`);
      return capacities;

    } catch (error) {
      logger.error(`Error getting all capacities: ${error}`);
      throw error;
    }
  }

  async checkCapacityAlerts(programType?: string): Promise<CapacityAlert[]> {
    try {
      logger.info(`Checking capacity alerts${programType ? ` for ${programType}` : ''}`);

      const alerts: CapacityAlert[] = [];
      const capacities = programType 
        ? await this.getCapacitiesForProgram(programType)
        : await this.getAllCapacities();

      for (const capacity of capacities) {
        // Check over capacity
        if (capacity.utilizationRate >= (this.alertThresholds.get(CapacityAlertType.OVER_CAPACITY)! * 100)) {
          alerts.push(this.createAlert(
            capacity,
            CapacityAlertType.OVER_CAPACITY,
            AlertSeverity.CRITICAL,
            `Program is at ${capacity.utilizationRate.toFixed(1)}% capacity (${capacity.confirmedEnrollment}/${capacity.totalCapacity})`
          ));
        }
        // Check near capacity
        else if (capacity.utilizationRate >= (this.alertThresholds.get(CapacityAlertType.NEAR_CAPACITY)! * 100)) {
          alerts.push(this.createAlert(
            capacity,
            CapacityAlertType.NEAR_CAPACITY,
            AlertSeverity.HIGH,
            `Program is approaching capacity at ${capacity.utilizationRate.toFixed(1)}% (${capacity.confirmedEnrollment}/${capacity.totalCapacity})`
          ));
        }
        // Check under capacity
        else if (capacity.utilizationRate <= (this.alertThresholds.get(CapacityAlertType.UNDER_CAPACITY)! * 100)) {
          alerts.push(this.createAlert(
            capacity,
            CapacityAlertType.UNDER_CAPACITY,
            AlertSeverity.MEDIUM,
            `Program is under-enrolled at ${capacity.utilizationRate.toFixed(1)}% capacity (${capacity.confirmedEnrollment}/${capacity.totalCapacity})`
          ));
        }

        // Check waitlist growth
        if (capacity.waitlistSize >= this.alertThresholds.get(CapacityAlertType.WAITLIST_GROWING)!) {
          alerts.push(this.createAlert(
            capacity,
            CapacityAlertType.WAITLIST_GROWING,
            AlertSeverity.MEDIUM,
            `Waitlist has grown to ${capacity.waitlistSize} students`
          ));
        }
      }

      // Store alerts in database
      for (const alert of alerts) {
        await this.storeAlert(alert);
      }

      logger.info(`Generated ${alerts.length} capacity alerts`);
      return alerts;

    } catch (error) {
      logger.error(`Error checking capacity alerts: ${error}`);
      throw error;
    }
  }

  async getEnrollmentProjection(programType: string, startDate: Date): Promise<EnrollmentProjection> {
    try {
      logger.info(`Generating enrollment projection for ${programType} starting ${startDate.toISOString()}`);

      const capacity = await this.getCurrentCapacity(programType, startDate);
      const historicalData = await this.getHistoricalEnrollmentData(programType);
      
      // Calculate projection factors
      const factors: ProjectionFactor[] = [];
      
      // Historical yield rate
      const avgYieldRate = this.calculateAverageYieldRate(historicalData);
      factors.push({
        factor: 'Historical Yield Rate',
        impact: avgYieldRate,
        confidence: 0.8,
        description: `Based on ${historicalData.length} previous cohorts`
      });

      // Current application volume
      const applicationVolume = await this.getCurrentApplicationVolume(programType, startDate);
      const volumeImpact = this.calculateVolumeImpact(applicationVolume, historicalData);
      factors.push({
        factor: 'Application Volume',
        impact: volumeImpact,
        confidence: 0.7,
        description: `Current applications: ${applicationVolume}`
      });

      // Waitlist conversion rate
      const waitlistConversionRate = await this.getWaitlistConversionRate(programType);
      factors.push({
        factor: 'Waitlist Conversion',
        impact: waitlistConversionRate,
        confidence: 0.6,
        description: `Historical waitlist conversion: ${(waitlistConversionRate * 100).toFixed(1)}%`
      });

      // Calculate projected enrollment
      const baseProjection = capacity.confirmedEnrollment + (capacity.pendingEnrollment * avgYieldRate);
      const volumeAdjustment = baseProjection * (volumeImpact / 100);
      const projectedEnrollment = Math.round(baseProjection + volumeAdjustment);

      // Calculate confidence level
      const confidenceLevel = factors.reduce((sum, factor) => sum + factor.confidence, 0) / factors.length;

      // Generate recommendations
      const recommendedActions = this.generateRecommendations(capacity, projectedEnrollment);

      const projection: EnrollmentProjection = {
        programType,
        startDate,
        currentEnrollment: capacity.confirmedEnrollment,
        projectedEnrollment,
        confidenceLevel,
        factors,
        recommendedActions
      };

      logger.info(`Enrollment projection generated for ${programType}: ${projectedEnrollment} students (${(confidenceLevel * 100).toFixed(1)}% confidence)`);
      return projection;

    } catch (error) {
      logger.error(`Error generating enrollment projection: ${error}`);
      throw error;
    }
  }

  async acknowledgeAlert(alertId: string, acknowledgedBy: string): Promise<CapacityAlert> {
    try {
      logger.info(`Acknowledging alert ${alertId} by ${acknowledgedBy}`);

      // In a real implementation, this would update the alert in the database
      // For now, we'll simulate the acknowledgment
      const alert: CapacityAlert = {
        id: alertId,
        programType: 'unknown',
        startDate: new Date(),
        alertType: CapacityAlertType.NEAR_CAPACITY,
        threshold: 85,
        currentValue: 90,
        message: 'Alert acknowledged',
        severity: AlertSeverity.MEDIUM,
        createdDate: new Date(),
        acknowledged: true,
        acknowledgedBy,
        acknowledgedDate: new Date()
      };

      logger.info(`Alert ${alertId} acknowledged by ${acknowledgedBy}`);
      return alert;

    } catch (error) {
      logger.error(`Error acknowledging alert: ${error}`);
      throw error;
    }
  }

  private async getEnrollmentCounts(programType: string, startDate: Date): Promise<{
    total: number;
    confirmed: number;
    pending: number;
  }> {
    try {
      // Get all applications for this program and start date
      const applications = await this.prisma.applications.findMany({
        where: {
          program_applied: programType,
          intended_start_date: startDate,
          status: {
            in: ['accepted', 'enrolled']
          }
        },
        include: {
          admission_decisions: true
        }
      });

      let confirmed = 0;
      let pending = 0;

      for (const application of applications) {
        const decision = application.admission_decisions[0];
        if (decision?.enrollment_data) {
          const enrollmentData = decision.enrollment_data as any;
          
          if (enrollmentData.status === 'enrolled') {
            confirmed++;
          } else if (['confirmed', 'deposit_pending', 'conditions_pending'].includes(enrollmentData.status)) {
            pending++;
          }
        }
      }

      return {
        total: confirmed + pending,
        confirmed,
        pending
      };

    } catch (error) {
      logger.error(`Error getting enrollment counts: ${error}`);
      return { total: 0, confirmed: 0, pending: 0 };
    }
  }

  private async getWaitlistSize(programType: string, startDate: Date): Promise<number> {
    try {
      const decisions = await this.prisma.admission_decisions.findMany({
        where: {
          waitlist_data: {
            not: null
          }
        },
        include: {
          applications: true
        }
      });

      const activeWaitlistEntries = decisions
        .map(d => d.waitlist_data as any)
        .filter(Boolean)
        .filter((entry: any) => {
          return entry.programType === programType &&
                 new Date(entry.intendedStartDate).getTime() === startDate.getTime() &&
                 entry.status === 'active';
        });

      return activeWaitlistEntries.length;

    } catch (error) {
      logger.error(`Error getting waitlist size: ${error}`);
      return 0;
    }
  }

  private async projectFinalEnrollment(
    programType: string,
    startDate: Date,
    enrollmentCounts: { total: number; confirmed: number; pending: number }
  ): Promise<number> {
    try {
      // Simple projection based on historical yield rates
      const historicalYieldRate = 0.75; // 75% default yield rate
      const projectedFromPending = enrollmentCounts.pending * historicalYieldRate;
      
      return Math.round(enrollmentCounts.confirmed + projectedFromPending);

    } catch (error) {
      logger.error(`Error projecting final enrollment: ${error}`);
      return enrollmentCounts.confirmed;
    }
  }

  private async getCapacitiesForProgram(programType: string): Promise<EnrollmentCapacity[]> {
    try {
      const startDates = await this.prisma.applications.findMany({
        where: { program_applied: programType },
        select: { intended_start_date: true },
        distinct: ['intended_start_date']
      });

      const capacities: EnrollmentCapacity[] = [];
      for (const { intended_start_date } of startDates) {
        const capacity = await this.getCurrentCapacity(programType, intended_start_date);
        capacities.push(capacity);
      }

      return capacities;

    } catch (error) {
      logger.error(`Error getting capacities for program: ${error}`);
      return [];
    }
  }

  private createAlert(
    capacity: EnrollmentCapacity,
    alertType: CapacityAlertType,
    severity: AlertSeverity,
    message: string
  ): CapacityAlert {
    return {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      programType: capacity.programType,
      startDate: capacity.startDate,
      alertType,
      threshold: this.alertThresholds.get(alertType) || 0,
      currentValue: alertType === CapacityAlertType.WAITLIST_GROWING 
        ? capacity.waitlistSize 
        : capacity.utilizationRate,
      message,
      severity,
      createdDate: new Date(),
      acknowledged: false
    };
  }

  private async storeAlert(alert: CapacityAlert): Promise<void> {
    try {
      // In a real implementation, this would store the alert in a dedicated table
      // For now, we'll log it
      logger.info(`Capacity Alert: ${alert.severity.toUpperCase()} - ${alert.message}`);

    } catch (error) {
      logger.error(`Error storing alert: ${error}`);
    }
  }

  private async getHistoricalEnrollmentData(programType: string): Promise<any[]> {
    // Simplified historical data - in reality would query historical enrollment records
    return [
      { cohort: '2023-fall', enrolled: 45, capacity: 50, yieldRate: 0.78 },
      { cohort: '2024-spring', enrolled: 42, capacity: 50, yieldRate: 0.75 },
      { cohort: '2024-fall', enrolled: 48, capacity: 50, yieldRate: 0.80 }
    ];
  }

  private calculateAverageYieldRate(historicalData: any[]): number {
    if (historicalData.length === 0) return 0.75; // Default 75%
    
    const totalYieldRate = historicalData.reduce((sum, data) => sum + data.yieldRate, 0);
    return totalYieldRate / historicalData.length;
  }

  private async getCurrentApplicationVolume(programType: string, startDate: Date): Promise<number> {
    try {
      const count = await this.prisma.applications.count({
        where: {
          program_applied: programType,
          intended_start_date: startDate
        }
      });

      return count;

    } catch (error) {
      logger.error(`Error getting application volume: ${error}`);
      return 0;
    }
  }

  private calculateVolumeImpact(currentVolume: number, historicalData: any[]): number {
    if (historicalData.length === 0) return 0;
    
    const avgHistoricalVolume = historicalData.reduce((sum, data) => sum + (data.enrolled / data.yieldRate), 0) / historicalData.length;
    const volumeChange = ((currentVolume - avgHistoricalVolume) / avgHistoricalVolume) * 100;
    
    return Math.max(-20, Math.min(20, volumeChange)); // Cap at ±20%
  }

  private async getWaitlistConversionRate(programType: string): Promise<number> {
    // Simplified - would calculate from historical waitlist data
    return 0.3; // 30% conversion rate
  }

  private generateRecommendations(capacity: EnrollmentCapacity, projectedEnrollment: number): string[] {
    const recommendations: string[] = [];
    
    if (projectedEnrollment > capacity.totalCapacity) {
      recommendations.push('Consider increasing program capacity or opening additional cohort');
      recommendations.push('Review waitlist for qualified candidates');
      recommendations.push('Implement stricter admission criteria for future cycles');
    } else if (projectedEnrollment < capacity.totalCapacity * 0.7) {
      recommendations.push('Increase marketing and recruitment efforts');
      recommendations.push('Consider offering incentives or scholarships');
      recommendations.push('Review admission criteria to ensure appropriate selectivity');
    }
    
    if (capacity.waitlistSize > 10) {
      recommendations.push('Consider offering admission to top waitlist candidates');
      recommendations.push('Communicate regularly with waitlisted students');
    }
    
    return recommendations;
  }
}