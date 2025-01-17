import * as t from '@babel/types';
import { type NodePath } from '@babel/core';
import { addNamed } from '@babel/helper-module-imports';
import type { Options } from '../plugin';

export const RENDER_SCOPE = 'slot';
export const TRANSFORM_ANNOTATION = 'million:transform';

export const getValidSpecifiers = (
  importDeclarationPath: NodePath<t.ImportDeclaration>,
  importedBindings: Record<string, string>,
): string[] => {
  const importDeclaration = importDeclarationPath.node;
  /**
   * Here we just check if the import declaration is using the correct package
   * in case another library exports a function called "block".
   */
  const validSpecifiers: string[] = [];

  if (
    !t.isImportDeclaration(importDeclaration) ||
    !importDeclaration.source.value.includes('million') ||
    !importDeclaration.specifiers.every((specifier) => {
      if (!t.isImportSpecifier(specifier)) return false;
      const importedSpecifier = specifier.imported;
      if (!t.isIdentifier(importedSpecifier)) return false;

      const checkValid = (validName: string) => {
        return (
          importedSpecifier.name === validName &&
          specifier.local.name === importedBindings[validName]
        );
      };

      const isSpecifierValid =
        checkValid('block') || checkValid('For') || checkValid('macro');

      if (isSpecifierValid) {
        validSpecifiers.push(importedSpecifier.name);
      }

      return isSpecifierValid;
    })
  ) {
    throw createDeopt(
      'Found unsupported import for block. Make sure blocks are imported from correctly.',
      importDeclarationPath,
    );
  }

  return validSpecifiers;
};

export const resolveCorrectImportSource = (
  options: Options,
  source: string,
) => {
  if (!source.startsWith('million')) return source;
  const mode = options.mode || 'react';
  if (options.server) {
    return `million/${mode}-server`;
  }
  return `million/${mode}`;
};

export const createError = (message: string, path: NodePath) => {
  return path.buildCodeFrameError(`[Million.js] ${message}`);
};

export const warn = (message: string, path: NodePath, mute?: boolean) => {
  if (mute) return;
  const err = createError(message, path);
  // eslint-disable-next-line no-console
  console.warn(
    err.message,
    '\n',
    'You may want to reference the Rules of Blocks (https://million.dev/docs/rules)',
    '\n',
  );
};

export const createDeopt = (
  message: string | null,
  callSitePath: NodePath,
  path?: NodePath,
) => {
  const { parent, node } = callSitePath;
  if (
    t.isVariableDeclarator(parent) &&
    'arguments' in node &&
    t.isIdentifier(node.arguments[0])
  ) {
    parent.init = node.arguments[0];
  }
  if (message === null) return new Error('');
  return createError(message, path ?? callSitePath);
};

export const resolvePath = (path: NodePath | NodePath[]): NodePath => {
  return Array.isArray(path) ? path[0]! : path;
};

export const isComponent = (name: string) => {
  return name.startsWith(name[0]!.toUpperCase());
};

export const trimJsxChildren = (jsx: t.JSXElement | t.JSXFragment) => {
  for (let i = jsx.children.length - 1; i >= 0; i--) {
    const child = jsx.children[i]!;
    if (t.isJSXText(child) && child.value.trim() === '') {
      jsx.children.splice(i, 1);
    }
  }
};

export const normalizeProperties = (properties: t.ObjectProperty[]) => {
  const seen = new Set<string>();
  for (let i = properties.length - 1; i >= 0; i--) {
    if (!properties[i]) {
      properties.splice(i, 1);
      continue;
    }
    const prop = properties[i]!;
    if (
      t.isObjectProperty(prop) &&
      t.isIdentifier(prop.key) &&
      seen.has(prop.key.name)
    ) {
      properties.splice(i, 1);
    }
    if (t.isObjectProperty(prop) && t.isIdentifier(prop.key)) {
      seen.add(prop.key.name);
    }
  }
  return properties;
};

export const addNamedCache = (
  name: string,
  source: string,
  path: NodePath,
  // cache: Map<string, t.Identifier>,
) => {
  // We no longer cache since it causes issues with HMR
  // TODO: Fix HMR
  // if (cache.has(name)) return cache.get(name)!;

  const id = addNamed(path, name, source, {
    nameHint: `${name}$`,
  });
  // cache.set(name, id);
  return id;
};

export const SVG_ELEMENTS = [
  'circle',
  'ellipse',
  'foreignObject',
  'image',
  'line',
  'path',
  'polygon',
  'polyline',
  'rect',
  'text',
  'textPath',
  'tspan',
  'svg',
  'g',
];
