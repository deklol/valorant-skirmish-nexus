
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { logApplicationError } from "@/utils/auditLogger";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  componentName?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

/**
 * Enhanced Error Boundary that logs errors to the audit system
 * This captures React errors and makes them visible in the admin audit log
 */
class AuditErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('AuditErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });

    // Log to audit system
    logApplicationError({
      component: this.props.componentName || 'Unknown Component',
      errorMessage: error.message,
      errorCode: error.name,
      metadata: {
        componentStack: errorInfo.componentStack,
        errorBoundary: true,
        url: window.location.href,
        timestamp: new Date().toISOString(),
        stack: error.stack
      }
    });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Card className="bg-slate-800 border-red-700 border-2">
          <CardHeader>
            <CardTitle className="text-red-400 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Something went wrong
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-slate-300">
              <p className="mb-2">An error occurred in the {this.props.componentName || 'application'}.</p>
              <p className="text-sm text-slate-400">
                This error has been automatically logged for investigation.
              </p>
            </div>
            
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="bg-slate-900 p-3 rounded text-xs font-mono text-red-300 overflow-auto max-h-32">
                <div className="mb-2 font-bold">Error Details:</div>
                <div>{this.state.error.message}</div>
                {this.state.error.stack && (
                  <div className="mt-2 text-slate-500">
                    {this.state.error.stack}
                  </div>
                )}
              </div>
            )}
            
            <Button 
              onClick={this.handleRetry}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

export default AuditErrorBoundary;
