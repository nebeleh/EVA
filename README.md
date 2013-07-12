visualization
=============

creating visualization using C++, emscripten, asm.js, html, three.js, WebGL, ...

Setup
-----

First install emscripten from this link: https://github.com/kripken/emscripten/wiki/Getting-Started-on-Ubuntu-12.10

Then add it to PATH:

<pre>echo "export PATH=~/emscripten:\$PATH" >> ~/.bashrc_custom</pre>

Compiling
---------

Now you can use this command to compile a C++ file into javascript:

<pre>emcc hello.cpp -o index.html</pre>

Or to create an asm.js version:

<pre>emcc hello.cpp -O2 -s ASM_JS=1 -o asm.html</pre>

Hosting
-------

I'm using a node.js server to load the emcripten generated html file. Then I push them to heroku for hosting.

<pre>heroku create
git push heroku master</pre>
