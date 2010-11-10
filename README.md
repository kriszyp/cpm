CPM (CommonJS Package Manager) is designed for simple, straightforward installation
of CommonJS packages into a target location/package. This is specifically designed to
make it easy to install packages for use in the browser or any server side JS 
environment (like Node). CPM is based on the CommonJS Mappings specification,
and will install all dependencies listed in the dependencies or mappings hash.

# Installation

Download and unzip/untar CPM. Then edit the startup script (cpm for unix or cpm.bat
for windows) to point to the path where you have put CPM, and copy the script into
a directory in your path (like /usr/local/bin in unix or C:\windows in windows). You
can also modify the registry URL in the startup script as well.

# Usage

The main use of CPM is to install packages. To install a package, go to the directory
where you want to install yours packages and run:

    cpm install package-to-install

You can also indicate the desired version to install with a second parameter:

    cpm install package-to-install 1.2.2
