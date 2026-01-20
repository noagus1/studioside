'use client'

export default function AuroraBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* Subtle base gradient - more transparent */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-transparent to-background/30" />
      
      {/* Aurora effects */}
      <div className="absolute inset-0">
        {/* Top right aurora - blue/purple */}
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-gradient-to-br from-blue-500/40 via-purple-500/30 to-pink-500/40 blur-3xl animate-pulse" />
        
        {/* Center aurora - purple/pink */}
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-gradient-to-br from-purple-500/30 via-pink-500/40 to-blue-500/30 blur-3xl animate-pulse" 
          style={{ animationDelay: '1s' }} 
        />
        
        {/* Bottom left aurora - pink/blue */}
        <div 
          className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-gradient-to-br from-pink-500/40 via-purple-500/30 to-blue-500/40 blur-3xl animate-pulse" 
          style={{ animationDelay: '2s' }} 
        />
      </div>
    </div>
  )
}

