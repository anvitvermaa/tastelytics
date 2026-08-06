import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-screen bg-[#008080] flex items-center justify-center p-4">
          <div className="bg-[#c0c0c0] border-[4px] border-white border-b-[#808080] border-r-[#808080] p-1 max-w-lg w-full shadow-retro">
            <div className="bg-[#0000a0] text-white font-bold px-2 py-1 flex justify-between items-center mb-4">
              <span>SYSTEM_ERROR.EXE</span>
              <button onClick={() => window.location.reload()} className="bg-[#c0c0c0] text-black border-2 border-white border-b-[#808080] border-r-[#808080] px-1 font-bold pb-1 text-xs leading-none">X</button>
            </div>
            <div className="px-4 pb-4 flex flex-col gap-4 text-black">
              <p className="font-bold">A fatal exception has occurred in the application.</p>
              <div className="bg-white border-2 border-[#808080] border-b-white border-r-white p-2 h-32 overflow-y-auto text-xs font-mono text-[#800000]">
                {this.state.error?.toString()}
              </div>
              <button onClick={() => window.location.reload()} className="self-center bg-[#c0c0c0] text-black border-[3px] border-white border-b-[#808080] border-r-[#808080] px-6 py-1 font-bold active:border-t-[#808080] active:border-l-[#808080] active:border-b-white active:border-r-white outline-none focus:ring-2 focus:ring-black focus:ring-offset-1">
                RESTART
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
