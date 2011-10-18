CPM (CommonJS Package Manager) is designed for simple, straightforward installation
of CommonJS packages into a target location/package. This is specifically designed to
make it easy to install packages for use in the browser or any server side JS
environment (like Node). CPM is based on the CommonJS Mappings specification,
and will install all dependencies listed in the dependencies or mappings hash.

# Installation

Download and unzip/untar CPM. Then edit the startup script (cpm for unix or cpm.bat
for windows) to point to the path where you have put CPM, and copy the script into
a directory in your path (like /usr/local/bin in unix or C:\windows in windows). You
can also modify the registry URL in the startup script as well. The startup script also
includes directions (in the comments) for running from Node instead of Rhino.

A quick one-line install on Mac OS and Linux is:

	curl https://raw.github.com/kriszyp/cpm/master/install | sh

# Usage

The main use of CPM is to install packages. To install a package, go to the directory
where your JavaScript is stored and where you want your packages to be installed and run:

    cpm install package-to-install

The packages will be downloaded and unzipped into the current working directory. CPM
will also create any top level package modules to point to package "main" modules.
You should be able to load the modules with any AMD compliant module loader, including
RequireJS, Dojo, or Curl. For example:

    <script src="dojo/dojo .js" data-dojo-config="async: true"></script>
    <script>
        require(["some-package/some-module"]);
    </script>

You can also indicate the desired version to install with a second parameter:

    cpm install package-to-install 1.2.2

To upgrade a package to the latest version, you can run:

    cpm upgrade package-to-upgrade

To specify a directory to install packages to, you can run:

    cpm --packages-path=~/Projects/my_project/libs install package-to-install

To specify a different registry to install packages from, you can run:

    cpm --registry=http://url.to.registry.com install package-to-install

Licensing
--------

CPM is licensed under the AFL or BSD license. It is administered under the Dojo foundation,
and all contributions require a Dojo CLA.
