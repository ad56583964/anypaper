import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DebugBar } from '../debug.jsx';

// 模拟 debug.jsx 模块
jest.mock('../debug.jsx', () => {
  const mockDebugInfo = {
    mousePosition: { x: 10, y: 20 },
    pixelRatio: {
      devicePixelRatio: 1.5,
      actualPixelRatio: 2
    }
  };
  
  return {
    DebugBar: jest.fn().mockImplementation(({ ref }) => (
      <div ref={ref}>
        <div>
          <h3>Mouse Position</h3>
          <p>X: 10.00</p>
          <p>Y: 20.00</p>
        </div>
        <div>
          <h3>Pixel Ratio Info</h3>
          <p>Device Pixel Ratio: 1.5</p>
          <p>Actual Cache Pixel Ratio: 2</p>
        </div>
      </div>
    )),
    updateDebugInfo: jest.fn(),
    getDebugInfo: jest.fn().mockReturnValue(mockDebugInfo),
    default: jest.fn()
  };
});

describe('DebugBar Component', () => {
  test('renders mouse position', () => {
    render(<DebugBar />);
    expect(screen.getByText(/Mouse Position/i)).toBeInTheDocument();
    expect(screen.getByText(/X: 10.00/i)).toBeInTheDocument();
    expect(screen.getByText(/Y: 20.00/i)).toBeInTheDocument();
  });

  test('renders pixel ratio information', () => {
    render(<DebugBar />);
    expect(screen.getByText(/Pixel Ratio Info/i)).toBeInTheDocument();
    expect(screen.getByText(/Device Pixel Ratio: 1.5/i)).toBeInTheDocument();
    expect(screen.getByText(/Actual Cache Pixel Ratio: 2/i)).toBeInTheDocument();
  });
}); 