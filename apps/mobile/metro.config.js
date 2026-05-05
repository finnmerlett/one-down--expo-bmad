// @ts-nocheck
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

config.resolver.blockList = [/\.test\.[jt]sx?$/];

const nativeWindConfig = withNativeWind(config, { input: './src/global.css' });
const defaultResolveRequest = nativeWindConfig.resolver.resolveRequest;

nativeWindConfig.resolver.resolveRequest = (context, moduleName, platform) => {
  const resolveRequest = defaultResolveRequest ?? context.resolveRequest;

  if (moduleName.startsWith('@/assets/')) {
    return resolveRequest(
      context,
      path.resolve(__dirname, 'assets', moduleName.slice('@/assets/'.length)),
      platform,
    );
  }

  if (moduleName.startsWith('@/')) {
    return resolveRequest(context, path.resolve(__dirname, 'src', moduleName.slice(2)), platform);
  }

  return resolveRequest(context, moduleName, platform);
};

module.exports = nativeWindConfig;
