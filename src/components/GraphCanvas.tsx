import React, { useEffect, useRef, useCallback, useState } from 'react';
import { renderGraph } from '../lib/graph';
import { useDebouncedPlot } from '../hooks/useDebouncedPlot';
import type { EquationItem } from '../types';

interface GraphCanvasProps {
    equations: EquationItem[];
    xMin: number;
    xMax: number;
    onSettingsChange: (xMin: number, xMax: number) => void;
}

function formatCoord(n: number): string {
    if (Math.abs(n) >= 1000) return n.toExponential(1);
    if (Number.isInteger(n)) return n.toString();
    return parseFloat(n.toFixed(4)).toString();
}

const GraphCanvas: React.FC<GraphCanvasProps> = ({ equations, xMin, xMax, onSettingsChange }) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const debouncedEquations = useDebouncedPlot(equations, 200);

    const isDragging = useRef(false);
    const dragStart = useRef({ x: 0, y: 0 });

    const xViewRef = useRef({ xMin, xMax });
    const yCenterRef = useRef(0);
    const yRangeRef = useRef(20);

    const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

    const updateYRange = useCallback(() => {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;
        const xRange = xViewRef.current.xMax - xViewRef.current.xMin;
        yRangeRef.current = (rect.height / rect.width) * xRange;
    }, []);

    useEffect(() => {
        xViewRef.current = { xMin, xMax };
        updateYRange();
    }, [xMin, xMax, updateYRange]);

    const draw = useCallback(() => {
        if (canvasRef.current && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const canvas = canvasRef.current;
            canvas.style.width = rect.width + 'px';
            canvas.style.height = rect.height + 'px';

            const yHalf = yRangeRef.current / 2;
            const yMin = yCenterRef.current - yHalf;
            const yMax = yCenterRef.current + yHalf;

            renderGraph(
                canvas,
                debouncedEquations,
                xViewRef.current.xMin,
                xViewRef.current.xMax,
                yMin,
                yMax,
            );
        }
    }, [debouncedEquations]);

    useEffect(() => { draw(); }, [draw]);

    useEffect(() => {
        const observer = new ResizeObserver(() => {
            updateYRange();
            draw();
        });
        if (containerRef.current) observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, [draw, updateYRange]);

    const getCanvasCoords = (clientX: number, clientY: number) => {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return { x: 0, y: 0 };
        return { x: clientX - rect.left, y: clientY - rect.top };
    };

    const getMathCoords = (canvasX: number, canvasY: number) => {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return { mx: 0, my: 0 };
        const xRange = xViewRef.current.xMax - xViewRef.current.xMin;
        const yRange = yRangeRef.current;
        const mx = xViewRef.current.xMin + (canvasX / rect.width) * xRange;
        const yHalf = yRange / 2;
        const my = (yCenterRef.current + yHalf) - (canvasY / rect.height) * yRange;
        return { mx, my };
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        isDragging.current = true;
        dragStart.current = getCanvasCoords(e.clientX, e.clientY);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;

        const coords = getCanvasCoords(e.clientX, e.clientY);
        setMousePos(coords);

        if (!isDragging.current) return;
        const dx = coords.x - dragStart.current.x;
        const dy = coords.y - dragStart.current.y;

        const xRange = xViewRef.current.xMax - xViewRef.current.xMin;
        const yRange = yRangeRef.current;

        const xPan = -(dx / rect.width) * xRange;
        const yPan = (dy / rect.height) * yRange;

        xViewRef.current = {
            xMin: xViewRef.current.xMin + xPan,
            xMax: xViewRef.current.xMax + xPan,
        };
        yCenterRef.current += yPan;

        dragStart.current = coords;
        draw();
    };

    const handleMouseUp = () => {
        if (isDragging.current) {
            isDragging.current = false;
            onSettingsChange(xViewRef.current.xMin, xViewRef.current.xMax);
        }
    };

    const handleMouseLeave = () => {
        setMousePos(null);
        handleMouseUp();
    };

    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;

        const xRange = xViewRef.current.xMax - xViewRef.current.xMin;
        const yRange = yRangeRef.current;
        const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9;

        const newXRange = xRange * zoomFactor;
        const newYRange = yRange * zoomFactor;

        const coords = getCanvasCoords(e.clientX, e.clientY);
        const mouseXRatio = coords.x / rect.width;
        const mouseYRatio = coords.y / rect.height;

        const centerX = xViewRef.current.xMin + mouseXRatio * xRange;
        const yHalf = yRange / 2;
        const yMin = yCenterRef.current - yHalf;
        const centerY = yMin + (1 - mouseYRatio) * yRange;

        xViewRef.current = {
            xMin: centerX - mouseXRatio * newXRange,
            xMax: centerX + (1 - mouseXRatio) * newXRange,
        };
        yCenterRef.current = centerY - (1 - mouseYRatio) * newYRange + newYRange / 2;
        yRangeRef.current = newYRange;

        draw();
    };

    const mathCoords = mousePos ? getMathCoords(mousePos.x, mousePos.y) : null;

    return (
        <div
            ref={containerRef}
            className="graph-canvas-container"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
            onWheel={handleWheel}
            style={{
                width: '100%',
                height: '100%',
                cursor: isDragging.current ? 'grabbing' : 'crosshair',
                overflow: 'hidden',
                position: 'relative',
            }}
        >
            <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
            {mousePos && mathCoords && !isDragging.current && (
                <>
                    <div
                        className="crosshair-h"
                        style={{ top: mousePos.y, left: 0, right: 0 }}
                    />
                    <div
                        className="crosshair-v"
                        style={{ left: mousePos.x, top: 0, bottom: 0 }}
                    />
                    <div
                        className="crosshair-tooltip"
                        style={{
                            left: mousePos.x + 12,
                            top: mousePos.y - 8,
                        }}
                    >
                        ({formatCoord(mathCoords.mx)}, {formatCoord(mathCoords.my)})
                    </div>
                </>
            )}
        </div>
    );
};

export default GraphCanvas;
