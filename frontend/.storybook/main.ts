import path from 'path';
import type { StorybookConfig } from '@storybook/react-webpack5';

const config: StorybookConfig = {
  stories: ['../app/**/*.stories.@(js|jsx|ts|tsx)'],
  addons: ['@storybook/addon-essentials', '@storybook/addon-a11y', '@storybook/addon-links'],
  framework: {
    name: '@storybook/react-webpack5',
    options: {},
  },
  staticDirs: ['../public'],
  webpackFinal: async config => {
    if (config.resolve) {
      config.resolve.alias = {
        ...config.resolve.alias,
        '@': path.resolve(__dirname, '../'),
        '@/app': path.resolve(__dirname, '../app'),
        '@/components': path.resolve(__dirname, '../components'),
        '@bank-logos': path.resolve(__dirname, '../app/bank-logos'),
      };
    }

    // Fix Node.js polyfills for browser environment
    config.resolve = config.resolve || {};
    config.resolve.fallback = {
      ...config.resolve.fallback,
      child_process: false,
      fs: false,
      path: false,
      os: false,
      crypto: false,
      stream: false,
      tty: false,
      util: false,
      buffer: false,
    };

    // Handle TypeScript/JSX files properly
    config.module = config.module || {};
    config.module.rules = config.module.rules || [];

    // Add proper TypeScript support
    config.module.rules.push({
      test: /\.[jt]sx?$/,
      exclude: /node_modules/,
      use: [
        {
          loader: 'ts-loader',
          options: {
            transpileOnly: true,
          },
        },
        {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-react', '@babel/preset-typescript'],
            plugins: ['@babel/plugin-transform-runtime'],
          },
        },
      ],
    });

    return config;
  },
  typescript: {
    check: false,
    reactDocgen: 'react-docgen-typescript',
  },
};

export default config;
