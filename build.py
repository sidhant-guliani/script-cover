#!/usr/bin/python2.6
#
# Copyright 2011 Google Inc. All Rights Reserved.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.


"""Build the ScriptCover Extension."""

__author__ = 'ekamenskaya@google.com (Ekaterina Kamenskaya)'

import logging
import optparse
import os
import shutil
import subprocess
import urllib
import zipfile

CHECKOUT_CLOSURE_COMMAND = ('svn checkout http://closure-library.googlecode.com'
                            '/svn/trunk/ closure-library')
CLOSURE_COMPILER_URL = ('http://closure-compiler.googlecode.com/files/'
                        'compiler-latest.zip')
SOY_COMPILER_URL = ('http://closure-templates.googlecode.com/files/'
                    'closure-templates-for-javascript-latest.zip')
COMPILE_CLOSURE_COMMAND = ' '.join(['python',
                                    os.path.join('closure-library', 'closure',
                                                 'bin', 'build',
                                                 'closurebuilder.py'),
                                    '--root=src',
                                    '--root=closure-library',
                                    '--root=build_gen',
                                    '--output_mode=compiled',
                                    '--output_file=%s',
                                    '--compiler_jar=compiler.jar'])
SOY_COMPILER_COMMAND = ('java -jar SoyToJsSrcCompiler.jar'
                        ' --shouldProvideRequireSoyNamespaces'
                        ' --outputPathFormat %(output)s'
                        ' %(file)s')


class ClosureError(Exception):
  pass


def BuildClosureScript(input_filenames, output_filename):
  """Build a compiled closure script based on the given input file.

  Args:
    input_filenames: A sequence of strings representing names of the input
                     scripts to compile.
    output_filename: A string representing the name of the output script.

  Raises:
    ClosureError: If closure fails to compile the given input file.
  """
  input_opts = ' '.join('--input=%s' % fname for fname in input_filenames)
  # Appends --input parameter to COMPILE_CLOSURE_COMMAND.
  cmd = COMPILE_CLOSURE_COMMAND % output_filename + ' ' + input_opts
  result = ExecuteCommand(cmd)
  if result or not os.path.exists(output_filename):
    raise ClosureError('Failed while compiling to %s.' % output_filename)


def BuildSoyJs(input_file):
  """Builds a javascript file from a soy file.

  Args:
    input_file: A path to the soy file to compile into JavaScript. The js file
      will be stored in build_gen/{FILENAME}.soy.js

  Raises:
    ClosureError: If the soy compiler fails to compile.
  """
  output_name = os.path.join('build_gen', '%s.js' % input_file)
  result = ExecuteCommand(
      SOY_COMPILER_COMMAND % {
          'file': input_file,
          'output': output_name})
  if result or not os.path.exists(os.path.join(output_name)):
    raise ClosureError('Failed while compiling the soy file %s.' % input_file)


def Clean():
  if os.path.exists(os.path.join('clean')):
    shutil.rmtree(os.path.join('build'))
  if os.path.exists(os.path.join('build_gen')):
    shutil.rmtree(os.path.join('build_gen'))


def ExecuteCommand(command):
  """Execute the given command and return the output.

  Args:
    command: A string representing the command to execute.

  Returns:
    The return code of the process.
  """
  print 'Running command: %s' % command
  process = subprocess.Popen(command.split(' '),
                             stdout=subprocess.PIPE,
                             stderr=subprocess.PIPE)
  results = process.communicate()
  if process.returncode:
    logging.error(results[1])
  return process.returncode


def SetupClosure():
  """Setup the closure library and compiler.

  Checkout the closure library using svn if it doesn't exist. Also, download
  the closure compiler.

  Raises:
    ClosureError: If the setup fails.
  """
  # Set up the svn repo for closure if it doesn't exist.
  if not os.path.exists(os.path.join('closure-library')):
    ExecuteCommand(CHECKOUT_CLOSURE_COMMAND)
    if not os.path.exists(os.path.join('closure-library')):
      logging.error(('Could not check out the closure library from svn. '
                     'Please check out the closure library to the '
                     '"closure-library" directory.'))
      raise ClosureError('Could not set up the closure library.')

  # Download the compiler jar if it doesn't exist.
  if not os.path.exists(os.path.join('compiler.jar')):
    (compiler_zip, _) = urllib.urlretrieve(CLOSURE_COMPILER_URL)
    compiler_zipfile = zipfile.ZipFile(compiler_zip)
    compiler_zipfile.extract(os.path.join('compiler.jar'))
    if not os.path.exists(os.path.join('compiler.jar')):
      logging.error('Could not download the closure compiler jar.')
      raise ClosureError('Could not find the closure compiler.')

  # Download the soy compiler jar if it doesn't exist.
  if (not os.path.exists('SoyToJsSrcCompiler.jar') or
      not os.path.exists(os.path.join('build_gen', 'soyutils_usegoog.js'))):
    (soy_compiler_zip, _) = urllib.urlretrieve(SOY_COMPILER_URL)
    soy_compiler_zipfile = zipfile.ZipFile(soy_compiler_zip)
    soy_compiler_zipfile.extract('SoyToJsSrcCompiler.jar')
    soy_compiler_zipfile.extract('soyutils_usegoog.js', 'build_gen')
    if (not os.path.exists('SoyToJsSrcCompiler.jar') or
        not os.path.exists(os.path.join('build_gen', 'soyutils_usegoog.js'))):
      logging.error('Could not download the soy compiler jar.')
      raise ClosureError('Could not find the soy compiler.')

def main():
  usage = 'usage: %prog [options]'
  parser = optparse.OptionParser(usage)
  parser.add_option('--clean', dest='build_clean',
                    action='store_true', default=False,
                    help='Clean the build directories.')
  options = parser.parse_args()[0]

  if options.build_clean:
    Clean()
    exit()

  # Set up the directories that will be built into.
  if not os.path.exists(os.path.join('build')):
    os.mkdir(os.path.join('build'))
  if not os.path.exists(os.path.join('build_gen')):
    os.mkdir(os.path.join('build_gen'))

  # Get external Closure resources.
  SetupClosure()

  # Compile the closure scripts.
  soy_files = ['coverage_report.soy', 'popup.soy']

  for soy_filename in soy_files:
    BuildSoyJs(os.path.join('src', soy_filename))

  js_targets = [('content_compiled.js',
                ['scriptLoader.js', 'instrumentation.js', 'startTool.js']),
                ('background_compiled.js',
                ['showCoverageHelper.js', 'background.js']),
                ('inject_compiled.js', ['backgroundInteraction.js']),
                ('popup_compiled.js', ['popup.js', 'background.js'])]
  for dest, sources in js_targets:
    BuildClosureScript((os.path.join('src', src) for src in sources),
                       os.path.join('build', dest))

  # Copy over the static resources
  if os.path.exists(os.path.join('build', 'styles')):
    shutil.rmtree(os.path.join('build', 'styles'))
  shutil.copytree(os.path.join('src', 'styles'),
                  os.path.join('build', 'styles'))
  if os.path.exists(os.path.join('build', 'third_party')):
    shutil.rmtree(os.path.join('build', 'third_party'))
  shutil.copytree(os.path.join('src', 'third_party'),
                  os.path.join('build', 'third_party'))
  static_files = [os.path.join('src', 'popup.html'),
                  os.path.join('src', 'manifest.json'),
                  os.path.join('src', 'brticon.png')]
  for static_file in static_files:
    shutil.copy(static_file, 'build')


if __name__ == '__main__':
  main()

