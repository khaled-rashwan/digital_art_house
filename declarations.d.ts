declare module '*.png' {
    const value: any; // Or const value: string;
    export default value;
  }
  
  declare module '*.jpg';
  declare module '*.jpeg';
  declare module '*.gif';
  declare module '*.svg';
  declare module '*.bmp';