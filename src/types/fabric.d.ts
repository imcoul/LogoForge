// Type declarations for fabric.js
// Ambient declarations for Fabric.js library - used at runtime only

// Declare fabric as available globally in browser environment
declare const fabric: {
  Point: {
    new (x: number, y: number): {
      x: number;
      y: number;
    };
  };
  Rect: {
    new (options: { left: number; top: number; width: number; height: number }): any;
  };
  Object: {
    new (options?: any): any;
    prototype: any;
  };
  Canvas: {
    new (element: HTMLCanvasElement | string, options?: any): any;
  };
  Group: {
    new (objects?: any[], options?: any): any;
  };
  Rect: {
    new (options?: any): any;
  };
  Circle: {
    new (options?: any): any;
  };
  Ellipse: {
    new (options?: any): any;
  };
  Line: {
    new (options?: any): any;
  };
  Path: {
    new (path: string | any[], options?: any): any;
  };
  Text: {
    new (text: string, options?: any): any;
  };
  Textbox: {
    new (text: string, options?: any): any;
  };
  Image: {
    new (src: string, options?: any, callback?: (img: HTMLImageElement) => void): any;
  };
  version: string;
};

// Also declare as module for import statements
declare module 'fabric' {
  export = fabric;
}
