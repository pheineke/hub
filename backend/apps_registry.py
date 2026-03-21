import pkgutil
import importlib
from fastapi import FastAPI
import apps

def include_apps(app: FastAPI):
    # Dynamically find modules in the `apps` package
    for module_info in pkgutil.iter_modules(apps.__path__):
        try:
            module = importlib.import_module(f"apps.{module_info.name}")
            # If the module has a 'router', we hook it up
            if hasattr(module, "router"):
                app.include_router(module.router, prefix=f"/api/apps/{module_info.name}", tags=[f"App: {module_info.name}"])
                print(f"Loaded app router: {module_info.name}")
        except Exception as e:
            print(f"Failed to load app {module_info.name}: {e}")
