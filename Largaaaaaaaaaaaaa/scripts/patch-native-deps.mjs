import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const defaultProjectRoot = path.resolve(path.dirname(__filename), '..');

const nativeDependencyPatches = [
  {
    name: 'react-native-worklets',
    relativePath: path.join('node_modules', 'react-native-worklets', 'android', 'CMakeLists.txt'),
    replacements: [
      {
        from: 'target_link_libraries(worklets log ReactAndroid::jsi fbjni::fbjni)',
        to: 'target_link_libraries(worklets c++_shared log ReactAndroid::jsi fbjni::fbjni)',
      },
    ],
  },
  {
    name: 'react-native-screens',
    relativePath: path.join('node_modules', 'react-native-screens', 'android', 'CMakeLists.txt'),
    replacements: [
      {
        from: `target_link_libraries(rnscreens
            ReactAndroid::reactnative`,
        to: `target_link_libraries(rnscreens
            c++_shared
            ReactAndroid::reactnative`,
      },
      {
        from: `target_link_libraries(
            rnscreens
                ReactAndroid::jsi`,
        to: `target_link_libraries(
            rnscreens
                c++_shared
                ReactAndroid::jsi`,
      },
      {
        from: `target_link_libraries(rnscreens
        ReactAndroid::jsi`,
        to: `target_link_libraries(rnscreens
        c++_shared
        ReactAndroid::jsi`,
      },
    ],
  },
  {
    name: 'react-native-reanimated',
    relativePath: path.join('node_modules', 'react-native-reanimated', 'android', 'CMakeLists.txt'),
    replacements: [
      {
        from: `target_link_libraries(reanimated log ReactAndroid::jsi fbjni::fbjni android
                      worklets)`,
        to: `target_link_libraries(reanimated c++_shared log ReactAndroid::jsi fbjni::fbjni android
                      worklets)`,
      },
    ],
  },
  {
    name: 'expo-modules-core',
    relativePath: path.join('node_modules', 'expo-modules-core', 'android', 'CMakeLists.txt'),
    replacements: [
      {
        from: `target_link_libraries(
  \${PACKAGE_NAME}
  CommonSettings`,
        to: `target_link_libraries(
  \${PACKAGE_NAME}
  c++_shared
  CommonSettings`,
      },
    ],
  },
  {
    name: 'react-native-app-cmake',
    relativePath: path.join(
      'node_modules',
      'react-native',
      'ReactAndroid',
      'cmake-utils',
      'ReactNative-application.cmake',
    ),
    replacements: [
      {
        from: 'target_compile_options(common_flags INTERFACE ${folly_FLAGS})',
        to: `target_compile_options(common_flags INTERFACE \${folly_FLAGS})
target_link_libraries(common_flags INTERFACE c++_shared)`,
      },
    ],
  },
];

function patchNativeDependency(projectRoot, dependencyPatch) {
  const cmakePath = path.join(projectRoot, dependencyPatch.relativePath);

  if (!existsSync(cmakePath)) {
    return {
      changed: false,
      skipped: true,
      target: cmakePath,
    };
  }

  const original = readFileSync(cmakePath, 'utf8');
  let updated = original;

  for (const replacement of dependencyPatch.replacements) {
    if (updated.includes(replacement.to)) {
      continue;
    }

    if (!updated.includes(replacement.from)) {
      throw new Error(
        `Unsupported ${dependencyPatch.name} CMake layout at ${cmakePath}. Expected to find replacement anchor.`,
      );
    }

    updated = updated.replace(replacement.from, replacement.to);
  }

  if (updated === original) {
    return {
      changed: false,
      skipped: false,
      target: cmakePath,
    };
  }

  writeFileSync(cmakePath, updated, 'utf8');

  return {
    changed: true,
    skipped: false,
    target: cmakePath,
  };
}

export function patchNativeDependencies(projectRoot = defaultProjectRoot) {
  const results = [];

  for (const dependencyPatch of nativeDependencyPatches) {
    const result = patchNativeDependency(projectRoot, dependencyPatch);
    results.push(result);

    if (result.skipped) {
      console.warn(`[patch-native-deps] Skipped missing dependency file: ${result.target}`);
      continue;
    }

    if (result.changed) {
      console.log(`[patch-native-deps] Patched ${dependencyPatch.name} at ${result.target}`);
    }
  }

  return results;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  patchNativeDependencies(process.argv[2] ? path.resolve(process.argv[2]) : defaultProjectRoot);
}
