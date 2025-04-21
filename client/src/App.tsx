import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Explorer from "@/pages/explorer";
import KnowledgeBase from "@/pages/knowledge-base";
import SavedRequests from "@/pages/saved-requests";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/explorer" component={Explorer} />
      <Route path="/knowledge-base" component={KnowledgeBase} />
      <Route path="/saved-requests" component={SavedRequests} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
