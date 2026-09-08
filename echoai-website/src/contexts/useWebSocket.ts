import { useContext } from 'react';
import WebSocketContext from './WebSocketContext';

// Custom hook for easy context consumption
export const useWebSocket = () => useContext(WebSocketContext);
