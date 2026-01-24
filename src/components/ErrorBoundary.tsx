
import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4 text-center">
                    <div className="bg-destructive/10 p-4 rounded-full mb-4">
                        <AlertCircle className="w-12 h-12 text-destructive" />
                    </div>
                    <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
                    <p className="text-muted-foreground mb-4 max-w-md">
                        {this.state.error?.message || "An unexpected error occurred."}
                    </p>
                    <Button onClick={() => window.location.reload()}>
                        Reload Page
                    </Button>
                    <div className="mt-8 p-4 bg-muted rounded-lg text-left w-full max-w-2xl overflow-auto text-xs font-mono">
                        <p className="font-bold mb-2">Error Details:</p>
                        <pre>{this.state.error?.stack}</pre>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
