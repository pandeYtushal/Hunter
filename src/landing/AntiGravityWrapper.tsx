import React, { useEffect, useRef, useState } from 'react';
import Matter from 'matter-js';

interface AntiGravityWrapperProps {
  children: React.ReactNode;
}

export const AntiGravityWrapper: React.FC<AntiGravityWrapperProps> = ({ children }) => {
  const [isActive, setIsActive] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Matter.Engine | null>(null);
  const renderRef = useRef<Matter.Render | null>(null);
  const runnerRef = useRef<Matter.Runner | null>(null);
  const elementsRef = useRef<{ dom: HTMLElement; body: Matter.Body; width: number; height: number }[]>([]);

  const enablePhysics = () => {
    if (!containerRef.current) return;

    // 1. Setup Matter Engine
    const engine = Matter.Engine.create();
    engine.world.gravity.y = 1; // standard gravity to drop them
    
    // 2. Query physics elements
    const domNodes = Array.from(containerRef.current.querySelectorAll('[data-physics="true"]')) as HTMLElement[];
    
    // We need to get the current scroll offset to correctly position bodies
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;

    const bodies = domNodes.map((dom) => {
      const rect = dom.getBoundingClientRect();
      
      // Calculate center of the element
      const x = rect.left + rect.width / 2 + scrollX;
      const y = rect.top + rect.height / 2 + scrollY;

      const body = Matter.Bodies.rectangle(x, y, rect.width, rect.height, {
        restitution: 0.8, // bounce
        friction: 0.1,
        frictionAir: 0.01,
        density: 0.001,
      });

      // Apply initial styling to decouple from standard flow
      dom.style.position = 'absolute';
      dom.style.left = '0px';
      dom.style.top = '0px';
      dom.style.width = `${rect.width}px`;
      dom.style.height = `${rect.height}px`;
      dom.style.zIndex = '50';
      dom.style.transform = `translate(${x - rect.width / 2}px, ${y - rect.height / 2}px)`;
      dom.style.transition = 'none';

      return { dom, body, width: rect.width, height: rect.height };
    });

    elementsRef.current = bodies;

    // 3. Create Walls (Floor, Ceiling, Left, Right) relative to the document size
    const docWidth = document.documentElement.scrollWidth;
    const docHeight = document.documentElement.scrollHeight;
    
    const wallOptions = { isStatic: true, restitution: 0.5 };
    const floor = Matter.Bodies.rectangle(docWidth / 2, docHeight + 50, docWidth + 200, 100, wallOptions);
    const ceiling = Matter.Bodies.rectangle(docWidth / 2, -50, docWidth + 200, 100, wallOptions);
    const leftWall = Matter.Bodies.rectangle(-50, docHeight / 2, 100, docHeight + 200, wallOptions);
    const rightWall = Matter.Bodies.rectangle(docWidth + 50, docHeight / 2, 100, docHeight + 200, wallOptions);

    Matter.World.add(engine.world, [...bodies.map(b => b.body), floor, ceiling, leftWall, rightWall]);

    // 4. Add Mouse Interaction
    const mouse = Matter.Mouse.create(document.body);
    const mouseConstraint = Matter.MouseConstraint.create(engine, {
      mouse: mouse,
      constraint: {
        stiffness: 0.2,
        render: { visible: false },
      },
    });
    Matter.World.add(engine.world, mouseConstraint);

    // Sync loop
    Matter.Events.on(engine, 'afterUpdate', () => {
      elementsRef.current.forEach(({ dom, body, width, height }) => {
        // We sync Matter's body center back to the DOM element's top-left based translation
        const x = body.position.x - width / 2;
        const y = body.position.y - height / 2;
        const angle = body.angle;
        dom.style.transform = `translate(${x}px, ${y}px) rotate(${angle}rad)`;
      });
    });

    const runner = Matter.Runner.create();
    Matter.Runner.run(runner, engine);

    engineRef.current = engine;
    runnerRef.current = runner;
  };

  const disablePhysics = () => {
    if (runnerRef.current) Matter.Runner.stop(runnerRef.current);
    if (engineRef.current) Matter.Engine.clear(engineRef.current);
    
    elementsRef.current.forEach(({ dom }) => {
      dom.style.position = '';
      dom.style.left = '';
      dom.style.top = '';
      dom.style.width = '';
      dom.style.height = '';
      dom.style.zIndex = '';
      dom.style.transform = '';
      dom.style.transition = ''; // Restore any original transitions
    });
    
    elementsRef.current = [];
    engineRef.current = null;
    runnerRef.current = null;
  };

  useEffect(() => {
    if (isActive) {
      enablePhysics();
    } else {
      disablePhysics();
    }

    return () => disablePhysics();
  }, [isActive]);

  return (
    <>
      <button 
        onClick={() => setIsActive(!isActive)}
        style={{
          position: 'fixed',
          bottom: '2rem',
          right: '2rem',
          zIndex: 1000,
          padding: '0.75rem 1.5rem',
          borderRadius: '9999px',
          backgroundColor: isActive ? 'var(--destructive, #ef4444)' : 'var(--primary)',
          color: isActive ? '#fff' : 'var(--primary-foreground)',
          fontWeight: 600,
          cursor: 'pointer',
          border: 'none',
          boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
          transition: 'all 0.2s',
          fontFamily: 'Inter, sans-serif'
        }}
      >
        {isActive ? 'Reset Layout' : 'Enable Zero-G Mode'}
      </button>

      <div ref={containerRef}>
        {children}
      </div>
    </>
  );
};
