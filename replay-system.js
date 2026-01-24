import { GameRenderer } from './game-renderer.js';
import { hsl } from 'd3-color';
import { getHslStringForLevel } from './utils.js';

export class ReplaySystem {
    constructor(canvas) {
        this.canvas = canvas;
        this.renderer = null; 
        this.animationId = null;
        this.replayData = null;
        this.startTime = 0;
        this.colors = null;
        this.isPlaying = false;
    }

    init(colors) {
        this.colors = colors;
        this.renderer = new GameRenderer(this.canvas, colors);
    }

    play(replayData) {
        if (!this.renderer) {
            console.error("ReplaySystem not initialized with colors");
            return;
        }

        this.replayData = replayData;
        const frames = replayData.frames;
        if (!frames || frames.length === 0) return;

        this.renderer.resize(replayData.config.difficulty);
        this.isPlaying = true;
        this.frameIndex = 0;
        this.startTime = performance.now();
        this.playbackStartTimestamp = frames[0].timestamp;
        
        this.loop();
    }

    stop() {
        this.isPlaying = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        // Clear canvas
        if (this.renderer && this.renderer.ctx) {
             this.renderer.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }

    loop() {
        if (!this.isPlaying) return;

        const now = performance.now();
        const elapsed = now - this.startTime;
        const currentReplayTime = this.playbackStartTimestamp + elapsed;

        const frames = this.replayData.frames;
        
        // Find current frame index based on timestamp
        let frame = frames[this.frameIndex];
        
        // Advance frame index
        while (this.frameIndex < frames.length - 1 && frames[this.frameIndex + 1].timestamp <= currentReplayTime) {
            this.frameIndex++;
        }
        
        frame = frames[this.frameIndex];
        
        if (this.frameIndex >= frames.length - 1) {
            // End of replay, loop it
            this.startTime = performance.now();
            this.frameIndex = 0;
            // Optional: pause a bit before loop?
        }

        // Construct render state from frame
        const renderState = {
            currentColorHsl: hsl(frame.targetColor), // Convert string back to d3-color object
            targetSize: frame.targetSize,
            targetStartAngle: frame.targetStartAngle,
            failTap: !frame.success && this.frameIndex >= frames.length - 5 ? { timestamp: performance.now(), angle: frame.angle } : null, // Simulate fail tap at end
            angle: frame.angle,
            replayFrame: frame // Pass full frame for visualizer pulse data
        };

        this.renderer.draw(renderState);

        this.animationId = requestAnimationFrame(() => this.loop());
    }
}