from django.urls import get_resolver
from drf_spectacular.views import SpectacularAPIView
from rest_framework.response import Response
from django.views.generic import TemplateView



class SchemaGroupedByNamespaceView(SpectacularAPIView):
    """
    Groups endpoints in Swagger/ReDoc strictly by Django namespace.
    - Each namespace (e.g. 'core', 'user') becomes its own Swagger group.
    - Non-namespaced routes (admin, schema, docs, etc.) are excluded.
    - Groups are sorted alphabetically.
    """

    def get(self, request, *args, **kwargs):
        # Generate base OpenAPI schema
        resp = super().get(request, *args, **kwargs)
        schema = getattr(resp, "data", {}) or {}
        paths = schema.get("paths", {})

        # Get registered namespaces
        resolver = get_resolver()
        namespaces = sorted(
            [ns for ns in getattr(resolver, "namespace_dict", {}).keys() if ns]
        )

        # Initialize groups by namespace
        groups = {ns.capitalize(): set() for ns in namespaces}

        # Assign each operation to its namespace group
        for path_str, ops in paths.items():
            matched_ns = None
            for ns in namespaces:
                if f"/{ns}/" in path_str or path_str.startswith(f"/{ns}"):
                    matched_ns = ns.capitalize()
                    break

            # Skip routes that are not under any namespace
            if not matched_ns:
                continue

            for op in ops.values():
                if isinstance(op, dict):
                    op["tags"] = [matched_ns]

            groups.setdefault(matched_ns, set()).add(matched_ns)

        # Sort alphabetically for predictable Swagger/ReDoc order
        schema["x-tagGroups"] = [
            {"name": name, "tags": sorted(tags)} for name, tags in sorted(groups.items())
        ]

        return Response(schema)

class WelcomeBackend(TemplateView):
    template_name = "app/template/Welcome.html"
