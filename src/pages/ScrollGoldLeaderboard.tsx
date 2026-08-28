import { Navigate } from 'react-router-dom';

/** Legacy learning-currency leaderboard retired in favor of evidence-based achievements. */
export default function ScrollGoldLeaderboard() {
  return <Navigate to="/achievements" replace />;
}
