import React, { useState, useEffect } from 'react'
import { 
  tsunamiPlaybackManager, 
  TsunamiPlaybackState, 
  TsunamiPlaybackControls,
  PLAYBACK_SPEEDS 
} from '../utils/tsunami-playback'

interface TsunamiPlaybackControlsProps {
  className?: string
}

export default function TsunamiPlaybackControlsPanel({ className = '' }: TsunamiPlaybackControlsProps) {
  const [state, setState] = useState<TsunamiPlaybackState>(tsunamiPlaybackManager.getState())
  const [controls, setControls] = useState<TsunamiPlaybackControls>(tsunamiPlaybackManager.getControls())

  useEffect(() => {
    const unsubscribe = tsunamiPlaybackManager.subscribe(setState)
    setControls(tsunamiPlaybackManager.getControls())
    
    // Add keyboard shortcuts
    const handleKeyPress = (event: KeyboardEvent) => {
      // Prevent shortcuts when typing in input fields
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement) {
        return
      }

      switch (event.code) {
        case 'Space':
          event.preventDefault()
          if (state.isPlaying) {
            controls.pause()
          } else {
            controls.play()
          }
          break
        case 'KeyR':
          controls.restart()
          break
        case 'KeyS':
          controls.stop()
          break
        case 'ArrowLeft':
          event.preventDefault()
          if (event.shiftKey) {
            controls.seekTo(Math.max(0, state.currentTime - 5))
          } else {
            controls.seekTo(Math.max(0, state.currentTime - 1))
          }
          break
        case 'ArrowRight':
          event.preventDefault()
          if (event.shiftKey) {
            controls.seekTo(Math.min(state.totalDuration, state.currentTime + 5))
          } else {
            controls.seekTo(Math.min(state.totalDuration, state.currentTime + 1))
          }
          break
        case 'Digit1':
          controls.setSpeed(0.25)
          break
        case 'Digit2':
          controls.setSpeed(0.5)
          break
        case 'Digit3':
          controls.setSpeed(1)
          break
        case 'Digit4':
          controls.setSpeed(2)
          break
        case 'Digit5':
          controls.setSpeed(4)
          break
        case 'Digit6':
          controls.setSpeed(8)
          break
        case 'Digit7':
          controls.setSpeed(16)
          break
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    
    return () => {
      unsubscribe()
      window.removeEventListener('keydown', handleKeyPress)
    }
  }, [state.isPlaying, state.currentTime, state.totalDuration, controls])

  const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60)
    const mins = Math.floor(minutes % 60)
    const secs = Math.floor((minutes % 1) * 60)
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const eventNames = {
    tohoku_2011: 'Tōhoku 2011 (M9.1)',
    alaska_2020: 'Alaska 2020 (M7.8)',
    chile_2015: 'Chile 2015 (M8.3)'
  }

  const getPlayButtonIcon = () => {
    if (state.isPlaying) {
      return (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 002 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      )
    } else {
      return (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
        </svg>
      )
    }
  }

  return (
    <div className={`bg-white rounded-lg shadow-lg p-4 space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800">Tsunami Simulation Controls</h3>
        <div className="text-sm text-gray-600">
          {eventNames[state.currentEvent as keyof typeof eventNames] || state.currentEvent}
        </div>
      </div>

      {/* Time Display */}
      <div className="text-center">
        <div className="text-2xl font-mono text-blue-600">
          {formatTime(state.currentTime)}
        </div>
        <div className="text-sm text-gray-500">
          of {formatTime(state.totalDuration)} ({state.progress.toFixed(1)}%)
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="relative">
          <input
            type="range"
            min="0"
            max="100"
            value={state.progress}
            onChange={(e) => controls.seekToProgress(parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
            style={{
              background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${state.progress}%, #e5e7eb ${state.progress}%, #e5e7eb 100%)`
            }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-500">
          <span>Start</span>
          <span>+1h</span>
          <span>+2h</span>
          <span>+3h</span>
          <span>+4h</span>
        </div>
      </div>

      {/* Main Controls */}
      <div className="flex items-center justify-center space-x-3">
        {/* Previous Event */}
        <button
          onClick={controls.previousEvent}
          className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          title="Previous Event"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M15.707 15.707a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 111.414 1.414L11.414 9H17a1 1 0 110 2h-5.586l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
        </button>

        {/* Restart */}
        <button
          onClick={controls.restart}
          className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
          title="Restart"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
          </svg>
        </button>

        {/* Play/Pause */}
        <button
          onClick={state.isPlaying ? controls.pause : controls.play}
          className="p-3 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors"
          title={state.isPlaying ? 'Pause' : 'Play'}
        >
          {getPlayButtonIcon()}
        </button>

        {/* Stop */}
        <button
          onClick={controls.stop}
          className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          title="Stop"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
          </svg>
        </button>

        {/* Next Event */}
        <button
          onClick={controls.nextEvent}
          className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          title="Next Event"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {/* Speed Controls */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Playback Speed: {state.playbackSpeed}x
        </label>
        <div className="grid grid-cols-7 gap-1">
          {PLAYBACK_SPEEDS.map((speed) => (
            <button
              key={speed}
              onClick={() => controls.setSpeed(speed)}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                state.playbackSpeed === speed
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {speed}x
            </button>
          ))}
        </div>
      </div>

      {/* Event Selector */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Historical Event
        </label>
        <select
          value={state.currentEvent}
          onChange={(e) => controls.setEvent(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="tohoku_2011">Tōhoku Earthquake & Tsunami (2011)</option>
          <option value="alaska_2020">Alaska Earthquake (2020)</option>
          <option value="chile_2015">Chile Earthquake (2015)</option>
        </select>
      </div>

      {/* Status Indicators */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${
            state.isPlaying ? 'bg-green-500' : state.isPaused ? 'bg-yellow-500' : 'bg-gray-400'
          }`} />
          <span className="text-gray-600">
            {state.isPlaying ? 'Playing' : state.isPaused ? 'Paused' : 'Stopped'}
          </span>
        </div>
        <div className="text-gray-500">
          Simulation Time
        </div>
      </div>

      {/* Advanced Controls */}
          <details className="group">
            <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
              Advanced Controls
            </summary>
            <div className="mt-3 space-y-3 pl-4 border-l-2 border-gray-200">
              {/* Time Jump Buttons */}
              <div className="space-y-2">
                <div className="text-xs font-medium text-gray-700">Quick Time Navigation</div>
                <div className="grid grid-cols-4 gap-2">
                  {[30, 60, 120, 180].map((minutes) => (
                    <button
                      key={minutes}
                      onClick={() => controls.seekTo(minutes)}
                      className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                    >
                      +{minutes}m
                    </button>
                  ))}
                </div>
              </div>

              {/* Fine Time Control */}
              <div className="space-y-2">
                <div className="text-xs font-medium text-gray-700">Fine Control</div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => controls.seekTo(Math.max(0, state.currentTime - 5))}
                    className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
                  >
                    -5m
                  </button>
                  <button
                    onClick={() => controls.seekTo(Math.max(0, state.currentTime - 1))}
                    className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
                  >
                    -1m
                  </button>
                  <button
                    onClick={() => controls.seekTo(Math.min(state.totalDuration, state.currentTime + 1))}
                    className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
                  >
                    +1m
                  </button>
                  <button
                    onClick={() => controls.seekTo(Math.min(state.totalDuration, state.currentTime + 5))}
                    className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
                  >
                    +5m
                  </button>
                </div>
              </div>

              {/* Keyboard Shortcuts */}
              <div className="space-y-2">
                <div className="text-xs font-medium text-gray-700">Keyboard Shortcuts</div>
                <div className="text-xs text-gray-600 space-y-1">
                  <div className="flex justify-between">
                    <span>Space</span>
                    <span>Play/Pause</span>
                  </div>
                  <div className="flex justify-between">
                    <span>R</span>
                    <span>Restart</span>
                  </div>
                  <div className="flex justify-between">
                    <span>S</span>
                    <span>Stop</span>
                  </div>
                  <div className="flex justify-between">
                    <span>← →</span>
                    <span>Seek ±1min</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Shift + ← →</span>
                    <span>Seek ±5min</span>
                  </div>
                  <div className="flex justify-between">
                    <span>1-7</span>
                    <span>Set speed</span>
                  </div>
                </div>
              </div>
            </div>
          </details>
    </div>
  )
}
