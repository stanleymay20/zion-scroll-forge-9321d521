import { Navigate } from 'react-router-dom';

/**
 * Learning currency was retired from Scroll University.
 * Legacy wallet URLs remain routable only so old bookmarks fail safely.
 */
export default function ScrollGoldWallet() {
  return <Navigate to="/achievements" replace />;
}
