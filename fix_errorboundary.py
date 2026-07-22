with open('src/components/ErrorBoundary.tsx', 'r') as f:
    c = f.read()

c = c.replace(
    '  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {\n    console.error(\'Uncaught error:\', error, errorInfo);\n  }',
    '  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {\n    console.error(\'Uncaught error:\', error, errorInfo);\n  }\n\n  public componentDidMount() {\n    window.addEventListener(\'unhandledrejection\', this.handleUnhandledRejection);\n  }\n\n  public componentWillUnmount() {\n    window.removeEventListener(\'unhandledrejection\', this.handleUnhandledRejection);\n  }\n\n  private handleUnhandledRejection = (event: PromiseRejectionEvent) => {\n    this.setState({ hasError: true, error: event.reason instanceof Error ? event.reason : new Error(String(event.reason)) });\n  };'
)

with open('src/components/ErrorBoundary.tsx', 'w') as f:
    f.write(c)
