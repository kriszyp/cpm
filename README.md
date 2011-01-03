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
where your JavaScript is stored and where you want your packages to be installed and run:

    cpm install package-to-install

The packages will be downloaded and unzipped into a "packages" sub-directory. CPM
will also create a "packages.js" script that can be used to configure your module loader.
For example, with RequireJS you can load a module from a package like this:

    <script src="js/packages/requirejs/require.js"></script>
    <script>
      // indicate the base URL:
      require({baseUrl:"js"});
      // load the packages.js configuration
      require(["packages"],function(){
      	// once loaded and executed, we can now use standard package/module naming:
        require(["some-package/some-module"]);
  	  });
    </script>
    
You can also indicate the desired version to install with a second parameter:

    cpm install package-to-install 1.2.2

