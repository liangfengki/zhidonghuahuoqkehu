"use client";
import React from "react";
import { Button } from "./button";
import { Card, CardContent } from "./card";
import { AlertCircle, RefreshCw } from "lucide-react";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Card className="border-[var(--color-danger)]/20 bg-[var(--color-danger)]/5">
          <CardContent className="p-6 text-center">
            <AlertCircle size={40} className="mx-auto mb-3 text-[var(--color-danger)]" />
            <h3 className="text-lg font-semibold text-[var(--color-fg)] mb-2">
              出现了一些问题
            </h3>
            <p className="text-sm text-[var(--color-muted-fg)] mb-4">
              {this.state.error?.message || "发生了未知错误"}
            </p>
            <Button
              variant="outline"
              onClick={this.handleReset}
              className="mx-auto"
            >
              <RefreshCw size={16} className="mr-1" />
              重试
            </Button>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}