import os
from app.telemetry import get_telemetry_resource


def test_telemetry_resource_attributes_configuration(monkeypatch):
    """Verify OpenTelemetry resource includes service name, environment, and deployed version."""
    monkeypatch.setenv("OTEL_SERVICE_NAME", "custom-kanban-service")
    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.setenv("DEPLOYED_VERSION", "20261005-001020-abcdef1")

    resource = get_telemetry_resource()

    assert resource is not None
    attributes = dict(resource.attributes)

    # 1. Service Name
    assert attributes.get("service.name") == "custom-kanban-service"

    # 2. Environment
    assert attributes.get("deployment.environment") == "production"
    assert attributes.get("environment") == "production"

    # 3. Deployed Version
    assert attributes.get("service.version") == "20261005-001020-abcdef1"
    assert attributes.get("deployed.version") == "20261005-001020-abcdef1"
