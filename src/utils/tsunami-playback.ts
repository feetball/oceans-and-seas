export interface TsunamiPlaybackState {
  isPlaying: boolean
  isPaused: boolean
  currentTime: number // Current simulation time in minutes from event start
  totalDuration: number // Total simulation duration in minutes
  playbackSpeed: number // Multiplier: 0.5x, 1x, 2x, 4x, 8x
  currentEvent: string
  progress: number // 0-100 percentage
}

export interface TsunamiPlaybackControls {
  play: () => void
  pause: () => void
  stop: () => void
  restart: () => void
  setSpeed: (speed: number) => void
  seekTo: (time: number) => void
  seekToProgress: (progress: number) => void
  nextEvent: () => void
  previousEvent: () => void
  setEvent: (eventId: string) => void
}

export const PLAYBACK_SPEEDS = [0.25, 0.5, 1, 2, 4, 8, 16]

export const DEFAULT_PLAYBACK_STATE: TsunamiPlaybackState = {
  isPlaying: false,
  isPaused: false,
  currentTime: 0,
  totalDuration: 240, // 4 hours in minutes
  playbackSpeed: 1,
  currentEvent: 'tohoku_2011',
  progress: 0
}

class TsunamiPlaybackManager {
  private static instance: TsunamiPlaybackManager
  private state: TsunamiPlaybackState = { ...DEFAULT_PLAYBACK_STATE }
  private intervalId: NodeJS.Timeout | null = null
  private callbacks: Set<(state: TsunamiPlaybackState) => void> = new Set()
  private lastUpdateTime: number = 0

  static getInstance(): TsunamiPlaybackManager {
    if (!TsunamiPlaybackManager.instance) {
      TsunamiPlaybackManager.instance = new TsunamiPlaybackManager()
    }
    return TsunamiPlaybackManager.instance
  }

  private updateState(updates: Partial<TsunamiPlaybackState>) {
    this.state = { ...this.state, ...updates }
    this.state.progress = (this.state.currentTime / this.state.totalDuration) * 100
    this.notifyCallbacks()
  }

  private notifyCallbacks() {
    this.callbacks.forEach(callback => callback({ ...this.state }))
  }

  private startPlayback() {
    if (this.intervalId) return

    this.lastUpdateTime = Date.now()
    
    this.intervalId = setInterval(() => {
      if (!this.state.isPlaying) return

      const now = Date.now()
      const deltaTime = (now - this.lastUpdateTime) / 1000 // seconds
      this.lastUpdateTime = now

      // Convert real seconds to simulation minutes based on playback speed
      // 1 real second = playbackSpeed simulation minutes
      const simulationDelta = deltaTime * this.state.playbackSpeed

      let newTime = this.state.currentTime + simulationDelta

      // Check if we've reached the end
      if (newTime >= this.state.totalDuration) {
        newTime = this.state.totalDuration
        this.updateState({ isPlaying: false, isPaused: true })
        this.stopPlayback()
      }

      this.updateState({ currentTime: newTime })
    }, 100) // Update every 100ms for smooth progress
  }

  private stopPlayback() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }

  getControls(): TsunamiPlaybackControls {
    return {
      play: () => {
        if (this.state.currentTime >= this.state.totalDuration) {
          this.updateState({ currentTime: 0 })
        }
        this.updateState({ isPlaying: true, isPaused: false })
        this.startPlayback()
      },

      pause: () => {
        this.updateState({ isPlaying: false, isPaused: true })
        this.stopPlayback()
      },

      stop: () => {
        this.updateState({ 
          isPlaying: false, 
          isPaused: false, 
          currentTime: 0 
        })
        this.stopPlayback()
      },

      restart: () => {
        this.updateState({ 
          isPlaying: true, 
          isPaused: false, 
          currentTime: 0 
        })
        this.startPlayback()
      },

      setSpeed: (speed: number) => {
        const validSpeed = PLAYBACK_SPEEDS.includes(speed) ? speed : 1
        this.updateState({ playbackSpeed: validSpeed })
      },

      seekTo: (time: number) => {
        const clampedTime = Math.max(0, Math.min(time, this.state.totalDuration))
        this.updateState({ currentTime: clampedTime })
      },

      seekToProgress: (progress: number) => {
        const clampedProgress = Math.max(0, Math.min(progress, 100))
        const time = (clampedProgress / 100) * this.state.totalDuration
        this.updateState({ currentTime: time })
      },

      nextEvent: () => {
        const events = ['tohoku_2011', 'alaska_2020', 'chile_2015']
        const currentIndex = events.indexOf(this.state.currentEvent)
        const nextIndex = (currentIndex + 1) % events.length
        this.updateState({ 
          currentEvent: events[nextIndex],
          currentTime: 0,
          isPlaying: false,
          isPaused: false
        })
        this.stopPlayback()
      },

      previousEvent: () => {
        const events = ['tohoku_2011', 'alaska_2020', 'chile_2015']
        const currentIndex = events.indexOf(this.state.currentEvent)
        const prevIndex = currentIndex === 0 ? events.length - 1 : currentIndex - 1
        this.updateState({ 
          currentEvent: events[prevIndex],
          currentTime: 0,
          isPlaying: false,
          isPaused: false
        })
        this.stopPlayback()
      },

      setEvent: (eventId: string) => {
        this.updateState({ 
          currentEvent: eventId,
          currentTime: 0,
          isPlaying: false,
          isPaused: false
        })
        this.stopPlayback()
      }
    }
  }

  getState(): TsunamiPlaybackState {
    return { ...this.state }
  }

  subscribe(callback: (state: TsunamiPlaybackState) => void): () => void {
    this.callbacks.add(callback)
    // Return unsubscribe function
    return () => {
      this.callbacks.delete(callback)
    }
  }

  // Get current simulation timestamp for data generation
  getCurrentTimestamp(): Date {
    const events = {
      tohoku_2011: new Date('2011-03-11T05:46:23Z'),
      alaska_2020: new Date('2020-07-22T06:12:44Z'),
      chile_2015: new Date('2015-09-16T22:54:33Z')
    }
    
    const eventStart = events[this.state.currentEvent as keyof typeof events] || events.tohoku_2011
    const simulationTime = this.state.currentTime * 60 * 1000 // Convert minutes to milliseconds
    
    return new Date(eventStart.getTime() + simulationTime)
  }

  // Calculate wave arrival time for a given buoy
  calculateWaveArrival(buoyLat: number, buoyLon: number, eventLat: number, eventLon: number): number {
    // Simple great circle distance calculation
    const R = 6371 // Earth's radius in km
    const dLat = (eventLat - buoyLat) * Math.PI / 180
    const dLon = (eventLon - buoyLon) * Math.PI / 180
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(buoyLat * Math.PI / 180) * Math.cos(eventLat * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    const distance = R * c

    // Tsunami wave speed approximation (varies with water depth, using average)
    const waveSpeed = 200 // km/h in deep ocean
    const arrivalTimeHours = distance / waveSpeed
    
    return arrivalTimeHours * 60 // Return in minutes
  }

  cleanup() {
    this.stopPlayback()
    this.callbacks.clear()
  }
}

export const tsunamiPlaybackManager = TsunamiPlaybackManager.getInstance()
