import { existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { patchNativeDependencies } from './patch-native-deps.mjs';

const __filename = fileURLToPath(import.meta.url);
const appRoot = path.resolve(path.dirname(__filename), '..');
function run(command, args, options = {}) {
  const isWindows = process.platform === 'win32';
  const [file, spawnArgs] = isWindows && /\.(cmd|bat)$/i.test(command)
    ? ['cmd.exe', ['/d', '/s', '/c', command, ...args]]
    : [command, args];

  const result = spawnSync(file, spawnArgs, {
    stdio: 'inherit',
    shell: false,
    ...options,
  });

  if (result.error) {
    throw result.error;
  }

  return result.status ?? 0;
}

function ensureDirectory(targetPath) {
  mkdirSync(targetPath, {
    recursive: true,
  });
}

function removeDirectoryIfExists(targetPath) {
  if (!existsSync(targetPath)) {
    return;
  }

  rmSync(targetPath, {
    force: true,
    recursive: true,
    maxRetries: 5,
    retryDelay: 200,
  });
}

function getAndroidStudioJavaHome() {
  const javaHome = 'C:\\Program Files\\Android\\Android Studio\\jbr';
  return existsSync(javaHome) ? javaHome : null;
}

function buildAndroidEnv() {
  const env = { ...process.env };
  const localAppData = env.LOCALAPPDATA;

  if (localAppData) {
    const androidSdkRoot = path.join(localAppData, 'Android', 'Sdk');

    if (existsSync(androidSdkRoot)) {
      env.ANDROID_HOME = androidSdkRoot;
      env.ANDROID_SDK_ROOT = androidSdkRoot;

      const extraPaths = [
        path.join(androidSdkRoot, 'platform-tools'),
        path.join(androidSdkRoot, 'emulator'),
      ];

      env.Path = `${extraPaths.join(';')};${env.Path ?? ''}`;
    }
  }

  const javaHome = getAndroidStudioJavaHome();

  if (javaHome) {
    env.JAVA_HOME = javaHome;
    env.Path = `${path.join(javaHome, 'bin')};${env.Path ?? ''}`;
  }

  const runtimeRoot = localAppData
    ? path.join(localAppData, 'LAB')
    : path.join(appRoot, '.android-build-runtime');

  env.LARGA_GRADLE_RUNTIME_ROOT = runtimeRoot;
  env.GRADLE_USER_HOME = path.join(runtimeRoot, 'gradle-user-home');

  return env;
}

function syncWorkspaceToStage(sourceRoot, stageRoot, env) {
  ensureDirectory(path.dirname(stageRoot));

  const result = spawnSync('robocopy', [
    sourceRoot,
    stageRoot,
    '/MIR',
    '/R:2',
    '/W:1',
    '/NFL',
    '/NDL',
    '/NJH',
    '/NJS',
    '/NP',
    '/XD',
    '.git',
    '.expo',
  ], {
    stdio: 'inherit',
    shell: false,
    env,
  });

  if (result.error) {
    throw result.error;
  }

  const exitCode = result.status ?? 0;

  if (exitCode >= 8) {
    throw new Error(`robocopy failed with exit code ${exitCode}`);
  }
}

function cleanStageTransientState(stageRoot) {
  const transientDirs = [
    'android/.gradle',
    'android/build',
    'android/app/build',
    'android/.cxx',
    'android/app/.cxx',
    'node_modules/expo-modules-autolinking/android/expo-gradle-plugin/expo-autolinking-settings-plugin/build',
    'node_modules/expo-modules-autolinking/android/expo-gradle-plugin/expo-autolinking-plugin-shared/build',
    'node_modules/expo-modules-autolinking/android/expo-gradle-plugin/expo-autolinking-plugin/build',
    'node_modules/@react-native/gradle-plugin/settings-plugin/build',
    'node_modules/@react-native/gradle-plugin/shared/build',
    'node_modules/@react-native/gradle-plugin/react-native-gradle-plugin/build',
    'node_modules/expo-dev-launcher/expo-dev-launcher-gradle-plugin/build',
    'node_modules/expo-modules-core/expo-module-gradle-plugin/build',
  ];

  for (const relativeDir of transientDirs) {
    removeDirectoryIfExists(path.join(stageRoot, relativeDir));
  }

  cleanNodeModulesAndroidBuildDirs(path.join(stageRoot, 'node_modules'));
}

function cleanNodeModulesAndroidBuildDirs(nodeModulesRoot) {
  if (!existsSync(nodeModulesRoot)) {
    return;
  }

  const pendingDirs = [nodeModulesRoot];

  while (pendingDirs.length > 0) {
    const currentDir = pendingDirs.pop();
    const entries = readdirSync(currentDir, {
      withFileTypes: true,
    });

    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }

      const fullPath = path.join(currentDir, entry.name);

      if (entry.name === 'android') {
        removeDirectoryIfExists(path.join(fullPath, '.gradle'));
        removeDirectoryIfExists(path.join(fullPath, '.cxx'));
        removeDirectoryIfExists(path.join(fullPath, 'build'));
        continue;
      }

      if (entry.name === 'build' || entry.name === '.cxx' || entry.name === '.gradle') {
        continue;
      }

      pendingDirs.push(fullPath);
    }
  }
}

function stopGradleDaemon(androidRoot, env) {
  if (!existsSync(path.join(androidRoot, 'gradlew.bat'))) {
    return;
  }

  run('gradlew.bat', ['--stop'], {
    cwd: androidRoot,
    env,
  });
}

function runAndroidFromStagedWorkspace() {
  const env = buildAndroidEnv();
  const runtimeRoot = env.LARGA_GRADLE_RUNTIME_ROOT;
  const stageRoot = path.join(runtimeRoot, 'w', 'app');
  const stageAndroidRoot = path.join(stageRoot, 'android');

  ensureDirectory(runtimeRoot);
  ensureDirectory(env.GRADLE_USER_HOME);
  patchNativeDependencies(appRoot);

  try {
    stopGradleDaemon(stageAndroidRoot, env);
  } catch {
    // Ignore daemon shutdown failures before stage sync.
  }

  syncWorkspaceToStage(appRoot, stageRoot, env);
  patchNativeDependencies(stageRoot);
  cleanStageTransientState(stageRoot);

  try {
    stopGradleDaemon(stageAndroidRoot, env);
    return run('npx.cmd', ['expo', 'run:android'], {
      cwd: stageRoot,
      env,
    });
  } finally {
    try {
      stopGradleDaemon(stageAndroidRoot, env);
    } catch {
      // Ignore daemon shutdown failures during cleanup.
    }
  }
}

function main() {
  if (process.platform !== 'win32') {
    const status = run(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['expo', 'run:android'], {
      cwd: appRoot,
      env: buildAndroidEnv(),
    });
    process.exit(status);
  }

  const status = runAndroidFromStagedWorkspace();
  process.exit(status);
}

main();
