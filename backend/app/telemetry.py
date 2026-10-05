import os
from typing import Optional
from fastapi import FastAPI
from opentelemetry import trace
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor, ConsoleSpanExporter


def get_telemetry_resource() -> Resource:
    """Create OpenTelemetry Resource with service name, environment, and deployed version."""
    service_name = os.getenv("OTEL_SERVICE_NAME", os.getenv("SERVICE_NAME", "kanban-backend"))
    environment = os.getenv("OTEL_DEPLOYMENT_ENVIRONMENT", os.getenv("ENVIRONMENT", "development"))
    deployed_version = os.getenv("OTEL_SERVICE_VERSION", os.getenv("APP_VERSION", os.getenv("DEPLOYED_VERSION", "0.1.0")))

    return Resource.create(
        attributes={
            "service.name": service_name,
            "deployment.environment": environment,
            "service.version": deployed_version,
            "environment": environment,
            "deployed.version": deployed_version,
        }
    )


def setup_telemetry(app: FastAPI) -> None:
    """
    Configure OpenTelemetry tracing for the FastAPI backend.
    
    Resource attributes included per specification:
    - service.name (Service Name): defaults to 'kanban-backend' or OTEL_SERVICE_NAME
    - deployment.environment (Environment): defaults to 'development' or ENVIRONMENT / OTEL_DEPLOYMENT_ENVIRONMENT
    - service.version (Deployed Version): defaults to APP_VERSION or OTEL_SERVICE_VERSION
    """
    resource = get_telemetry_resource()
    provider = TracerProvider(resource=resource)

    # Check for OTLP exporter endpoint (standard OTLP gRPC or HTTP)
    otlp_endpoint = os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT")
    if otlp_endpoint:
        try:
            from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
            exporter = OTLPSpanExporter()
            provider.add_span_processor(BatchSpanProcessor(exporter))
        except Exception as e:
            print(f"[Telemetry] Warning: failed to initialize OTLP exporter: {e}")
    elif os.getenv("OTEL_CONSOLE_EXPORTER", "").lower() in ("true", "1"):
        # Allow optional console debugging of spans when requested
        provider.add_span_processor(BatchSpanProcessor(ConsoleSpanExporter()))

    trace.set_tracer_provider(provider)

    # Auto-instrument FastAPI routes and requests
    FastAPIInstrumentor.instrument_app(
        app,
        tracer_provider=provider,
        excluded_urls="health",
    )
