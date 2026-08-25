from setuptools import find_packages, setup

setup(
    name="sdncenter-currency-converter",
    version="0.6.1",
    author="SdNcenter Sp. z o. o.",
    author_email="support@javonet.com",
    description="A simplified Python library for currency conversion",
    long_description=(
        "Simplified Python library for currency conversion using fixed rates."
    ),
    long_description_content_type="text/markdown",
    url="https://www.javonet.com/",
    packages=find_packages(),
    classifiers=[
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.6",
        "Programming Language :: Python :: 3.7",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
        "Topic :: Office/Business :: Financial",
        "Topic :: Software Development :: Libraries :: Python Modules",
    ],
    python_requires=">=3.6",
    keywords="currency, converter, exchange, finance, money",
    install_requires=[],
    license="MIT",
)
