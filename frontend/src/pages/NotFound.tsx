import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BRAND } from "@/core/constants/brand";
import { Home, ArrowLeft } from "lucide-react";

const NotFound = () => {
    const location = useLocation();

    return (
        <div className="flex min-h-screen items-center justify-center bg-background p-6">
            <div className="text-center max-w-md space-y-6">
                <p className="text-6xl font-black text-primary/20">404</p>
                <div className="space-y-2">
                    <h1 className="text-2xl font-bold text-foreground">Page not found</h1>
                    <p className="text-muted-foreground text-sm">
                        <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">{location.pathname}</span>{" "}
                        doesn&apos;t exist in {BRAND.name}.
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button asChild>
                        <Link to="/">
                            <Home className="w-4 h-4 mr-2" />
                            Go to dashboard
                        </Link>
                    </Button>
                    <Button type="button" variant="outline" onClick={() => window.history.back()}>
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Go back
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default NotFound;
