from setuptools import setup, find_packages

setup(
    name="ghosttrace",
    version="0.1.0",
    packages=find_packages(),
    package_data={"ghosttrace": ["py.typed"]},
    include_package_data=True,
    zip_safe=False,
)
