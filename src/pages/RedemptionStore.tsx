import { Navigate } from 'react-router-dom';

/** Learning-currency redemption was retired; achievements remain non-economic. */
export default function RedemptionStore() {
  return <Navigate to="/achievements" replace />;
}
