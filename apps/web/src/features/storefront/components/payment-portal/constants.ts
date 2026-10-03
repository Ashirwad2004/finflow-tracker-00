export const customAnimations = `
@keyframes scan-laser {
  0% { transform: translateY(0); opacity: 0.8; }
  50% { transform: translateY(160px); opacity: 1; filter: drop-shadow(0 0 8px #10b981); }
  100% { transform: translateY(0); opacity: 0.8; }
}
@keyframes pulse-border {
  0%, 100% { border-color: rgba(99, 102, 241, 0.4); box-shadow: 0 0 0 0px rgba(99, 102, 241, 0.2); }
  50% { border-color: rgba(99, 102, 241, 0.8); box-shadow: 0 0 0 8px rgba(99, 102, 241, 0); }
}
@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-5px); }
}
`;
