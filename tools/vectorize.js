const sharp = require('sharp');
const potrace = require('potrace');
const { Resvg } = require('@resvg/resvg-js');
const fs = require('fs');
const path = require('path');

// Color deseado
const mainColor = '#009D45';

async function vectorize() {
  try {
    const inputPath = path.join(__dirname, '../public/aniayni.png');
    const outputDir = path.join(__dirname, '../public');

    console.log('🚀 Vectorizando aniayni.png con color #009D45...');
    
    // Verificar imagen
    if (!fs.existsSync(inputPath)) {
      throw new Error(`No se encontró la imagen en: ${inputPath}`);
    }

    // Leer información de la imagen original
    const metadata = await sharp(inputPath).metadata();
    console.log(`📷 Imagen original: ${metadata.width}x${metadata.height}, formato: ${metadata.format}`);

    // Preprocesar imagen - aplanar con fondo blanco para preservar agujeros
    console.log('🔧 Preprocesando imagen...');
    
    // Extraer el canal alfa - las letras tienen color (opacas), el fondo es transparente
    // Esto nos da las letras como áreas blancas sobre fondo negro
    const imageBuffer = await sharp(inputPath)
      .ensureAlpha()
      .extractChannel('alpha') // Extraer solo el canal alfa
      .negate() // Invertir: áreas opacas (letras) -> negro, transparentes -> blanco
      .threshold(128)
      .png()
      .toBuffer();
    
    // Guardar imagen preprocesada para debug
    const debugPath = path.join(outputDir, 'aniayni-debug.png');
    fs.writeFileSync(debugPath, imageBuffer);
    console.log(`📝 Imagen preprocesada guardada: aniayni-debug.png`);

    // Configuraciones
    const configs = [
      { name: 'original', optTolerance: 0.4, alphaMax: 1.0, turdSize: 50 },
      { name: 'smooth', optTolerance: 0.1, alphaMax: 0.5, turdSize: 20 }
    ];

    for (const config of configs) {
      console.log(`📝 Generando versión ${config.name}...`);
      
      const svgString = await new Promise((resolve, reject) => {
        potrace.trace(imageBuffer, {
          threshold: 128,
          optTolerance: config.optTolerance,
          turdSize: config.turdSize,
          turnPolicy: potrace.Potrace.TURNPOLICY_MINORITY,
          alphaMax: config.alphaMax,
          optCurve: true,
          color: mainColor,
          background: 'transparent'
        }, (err, svg) => {
          if (err) reject(err);
          else resolve(svg);
        });
      });

      // Verificar si el SVG tiene contenido
      const hasContent = svgString.includes(' d="M') || svgString.includes(' d="m');
      
      if (!hasContent) {
        console.log(`⚠️  Versión ${config.name} vacía, probando posterize...`);
        
        // Método alternativo: usar posterize
        const altSvg = await new Promise((resolve, reject) => {
          potrace.posterize(imageBuffer, {
            threshold: 128,
            steps: 2,
            color: mainColor,
            background: 'transparent'
          }, (err, svg) => {
            if (err) reject(err);
            else resolve(svg);
          });
        });
        
        // Guardar SVG
        const svgPath = path.join(outputDir, `aniayni-${config.name}.svg`);
        fs.writeFileSync(svgPath, altSvg);
        
        // Generar PNG
        try {
          const resvg = new Resvg(altSvg, {
            background: 'rgba(255, 255, 255, 0)',
            fitTo: { mode: 'width', value: 512 }
          });
          const pngData = resvg.render();
          const pngBuffer = pngData.asPng();
          const pngPath = path.join(outputDir, `aniayni-${config.name}.png`);
          fs.writeFileSync(pngPath, pngBuffer);
        } catch (e) {
          console.log(`⚠️  Error generando PNG: ${e.message}`);
        }
      } else {
        // Guardar SVG normal
        const svgPath = path.join(outputDir, `aniayni-${config.name}.svg`);
        fs.writeFileSync(svgPath, svgString);

        // Generar PNG
        try {
          const resvg = new Resvg(svgString, {
            background: 'rgba(255, 255, 255, 0)',
            fitTo: { mode: 'width', value: 512 }
          });
          const pngData = resvg.render();
          const pngBuffer = pngData.asPng();
          const pngPath = path.join(outputDir, `aniayni-${config.name}.png`);
          fs.writeFileSync(pngPath, pngBuffer);
        } catch (e) {
          console.log(`⚠️  Error generando PNG: ${e.message}`);
        }
      }
      
      console.log(`✅ ${config.name} generado`);
    }

    console.log('\n🎉 Vectorización completada!');
    console.log(`📁 Archivos en: ${outputDir}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

vectorize();