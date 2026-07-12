import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

const customPrefixesPlugin = () => {
  return {
    postcssPlugin: 'custom-prefixes-plugin',
    Declaration: {
      '-webkit-text-size-adjust': (decl) => {
        const parent = decl.parent;
        if (parent && !parent.some(node => node.prop === 'text-size-adjust')) {
          decl.after({ prop: 'text-size-adjust', value: decl.value });
        }
      },
      'user-select': (decl) => {
        const parent = decl.parent;
        if (parent && !parent.some(node => node.prop === '-webkit-user-select')) {
          decl.before({ prop: '-webkit-user-select', value: decl.value });
        }
      }
    }
  };
};
customPrefixesPlugin.postcss = true;

export default {
  plugins: [
    tailwindcss(),
    customPrefixesPlugin(),
    autoprefixer(),
  ],
};
