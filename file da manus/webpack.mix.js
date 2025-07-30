const mix = require('laravel-mix');
const path = require('path');

/*
 |--------------------------------------------------------------------------
 | Mix Asset Management - AI Co-Pilota Pro v2.0
 |--------------------------------------------------------------------------
 |
 | Configurazione ottimizzata per eliminare conflitti JavaScript
 | e migliorare le performance del sistema AI Co-Pilota.
 |
 */

// Configurazione base
mix.options({
    processCssUrls: false,
    clearConsole: false
});

// Configurazione Webpack personalizzata
mix.webpackConfig({
    resolve: {
        alias: {
            '@': path.resolve('resources/js'),
            '@ai-copilot': path.resolve('resources/js/ai-copilot'),
            '@components': path.resolve('resources/js/ai-copilot/components'),
            '@services': path.resolve('resources/js/ai-copilot/services'),
            '@utils': path.resolve('resources/js/ai-copilot/utils')
        }
    },
    externals: {
        // Usa jQuery globale dal tema per evitare conflitti
        'jquery': 'jQuery',
        '$': 'jQuery'
    },
    optimization: {
        splitChunks: {
            chunks: 'all',
            cacheGroups: {
                vendor: {
                    test: /[\\/]node_modules[\\/]/,
                    name: 'vendor',
                    chunks: 'all',
                    priority: 10
                },
                aiCopilot: {
                    test: /[\\/]resources[\\/]js[\\/]ai-copilot[\\/]/,
                    name: 'ai-copilot',
                    chunks: 'all',
                    priority: 20
                }
            }
        }
    }
});

// Compilazione CSS principale
mix.sass('resources/sass/app.scss', 'public/css')
   .sass('resources/sass/ai-copilot.scss', 'public/css');

// Compilazione JavaScript modulare
mix.js('resources/js/app.js', 'public/js')
   .js('resources/js/ai-copilot/main.js', 'public/js/ai-copilot.js');

// Copia assets statici
mix.copyDirectory('resources/images', 'public/images');

// Versioning per cache busting in produzione
if (mix.inProduction()) {
    mix.version();
    
    // Ottimizzazioni produzione
    mix.options({
        terser: {
            terserOptions: {
                compress: {
                    drop_console: true,
                    drop_debugger: true
                }
            }
        }
    });
} else {
    // Configurazione sviluppo
    mix.sourceMaps(true, 'eval-source-map');
}

