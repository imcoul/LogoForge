import { Project } from '../store';

export interface DesignToken {
  value: string;
  type: string;
  description?: string;
}

/**
 * Generates standard W3C or Tokens Studio compliant Design Tokens JSON
 */
export function generateDesignTokens(project: Project, format: 'w3c' | 'tokens-studio') {
  const guide = project.brandGuide;
  const tokenKey = (key: string) => format === 'w3c' ? `$${key}` : key;

  const colors: Record<string, any> = {};
  
  if (guide?.primaryColors && guide.primaryColors.length > 0) {
    guide.primaryColors.forEach((c, idx) => {
      const name = (c.name || `primary-${idx}`).replace(/\s+/g, '-').toLowerCase();
      colors[`primary-${name}`] = {
        [tokenKey('value')]: c.hex,
        [tokenKey('type')]: 'color',
        [tokenKey('description')]: c.usage || `Primary color for ${project.name}`
      };
    });
  } else {
    colors['primary-turquoise'] = {
      [tokenKey('value')]: '#40e0d0',
      [tokenKey('type')]: 'color',
      [tokenKey('description')]: 'Service Turquoise primary accent'
    };
    colors['primary-purple'] = {
      [tokenKey('value')]: '#800080',
      [tokenKey('type')]: 'color',
      [tokenKey('description')]: 'Leadership Purple accent'
    };
  }

  if (guide?.secondaryColors && guide.secondaryColors.length > 0) {
    guide.secondaryColors.forEach((c, idx) => {
      const name = (c.name || `secondary-${idx}`).replace(/\s+/g, '-').toLowerCase();
      colors[`secondary-${name}`] = {
        [tokenKey('value')]: c.hex,
        [tokenKey('type')]: 'color',
        [tokenKey('description')]: c.usage || `Secondary color for ${project.name}`
      };
    });
  } else {
    colors['secondary-yellow'] = {
      [tokenKey('value')]: '#ffff80',
      [tokenKey('type')]: 'color',
      [tokenKey('description')]: 'Growth Yellow secondary accent'
    };
  }

  // Typography Tokens
  const fontHeading = guide?.typography?.primaryFont || 'Comfortaa';
  const fontBody = guide?.typography?.secondaryFont || 'Quicksand';

  const fontFamilies = {
    'heading': {
      [tokenKey('value')]: fontHeading,
      [tokenKey('type')]: 'fontFamily',
      [tokenKey('description')]: 'Primary font for display headers'
    },
    'body': {
      [tokenKey('value')]: fontBody,
      [tokenKey('type')]: 'fontFamily',
      [tokenKey('description')]: 'Body font for paragraphs and labels'
    }
  };

  const asset = {
    'svg-markup': {
      [tokenKey('value')]: project.svgSource || '',
      [tokenKey('type')]: 'string',
      [tokenKey('description')]: 'Vector SVG logo source markup'
    }
  };

  return {
    metadata: {
      brand: project.name,
      exportedAt: new Date().toISOString(),
      format: format
    },
    color: colors,
    fontFamily: fontFamilies,
    asset: asset
  };
}

/**
 * Converts a hex color string to Figma's RGB decimal format {r, g, b, a}
 */
export function hexToFigmaRgb(hex: string) {
  const cleanHex = hex.replace('#', '');
  if (cleanHex.length === 3) {
    const r = parseInt(cleanHex[0] + cleanHex[0], 16) / 255;
    const g = parseInt(cleanHex[1] + cleanHex[1], 16) / 255;
    const b = parseInt(cleanHex[2] + cleanHex[2], 16) / 255;
    return { r, g, b, a: 1 };
  }
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;
  return { r, g, b, a: 1 };
}

/**
 * Tests access to a Figma file using the developer's PAT
 */
export async function testFigmaConnection(token: string, fileId: string): Promise<{ success: boolean; name?: string; error?: string }> {
  try {
    const response = await fetch(`https://api.figma.com/v1/files/${fileId}`, {
      headers: {
        'X-Figma-Token': token
      }
    });
    
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errData.message || `Figma API Error (HTTP ${response.status})`
      };
    }
    
    const data = await response.json();
    return {
      success: true,
      name: data.name
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || String(err)
    };
  }
}

/**
 * Pushes design token variables to Figma via the REST Variables API
 */
export async function pushVariablesToFigma(
  token: string,
  fileId: string,
  project: Project
): Promise<{ success: boolean; message: string }> {
  const guide = project.brandGuide;
  if (!guide) {
    return { success: false, message: 'Active project has no generated Brand Guide to export.' };
  }

  try {
    // 1. Gather color definitions
    const colorsToExport: { name: string; hex: string }[] = [];
    if (guide.primaryColors) {
      guide.primaryColors.forEach((c, idx) => {
        colorsToExport.push({ name: `Primary/${c.name || `Color-${idx}`}`, hex: c.hex });
      });
    }
    if (guide.secondaryColors) {
      guide.secondaryColors.forEach((c, idx) => {
        colorsToExport.push({ name: `Secondary/${c.name || `Color-${idx}`}`, hex: c.hex });
      });
    }

    if (colorsToExport.length === 0) {
      return { success: false, message: 'No colors found in active Brand Guide.' };
    }

    // Since variables require local collections, let's create a collection write action payload
    const tempCollectionId = 'col_forgel_os';
    const initialModeId = 'mode_default';
    
    const variableCollections = [
      {
        action: 'CREATE',
        id: tempCollectionId,
        name: `${project.name || 'Forgel'} OS Brand Colors`,
        initialModeId: initialModeId
      }
    ];

    const variables: any[] = [];
    const variableModeValues: any[] = [];

    colorsToExport.forEach((color, index) => {
      const varId = `var_${index}`;
      variables.push({
        action: 'CREATE',
        id: varId,
        name: color.name,
        variableCollectionId: tempCollectionId,
        resolvedType: 'COLOR'
      });

      variableModeValues.push({
        variableId: varId,
        modeId: initialModeId,
        value: hexToFigmaRgb(color.hex)
      });
    });

    const body = {
      variableCollections,
      variables,
      variableModeValues
    };

    const response = await fetch(`https://api.figma.com/v1/files/${fileId}/variables`, {
      method: 'POST',
      headers: {
        'X-Figma-Token': token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      // If the user's Figma team is not on Enterprise or Education (which variables POST API requires),
      // we gracefully report the detailed limitation of the Figma API while validating that their connection is otherwise perfect!
      if (response.status === 403) {
        return {
          success: false,
          message: 'Figma Variables API successfully authenticated, but variables require a paid Figma Team / Enterprise account. Please copy the tokens JSON payload instead to import manually!'
        };
      }
      return {
        success: false,
        message: errData.message || `Figma API returned HTTP ${response.status} when creating variables.`
      };
    }

    return {
      success: true,
      message: `Successfully synchronized ${colorsToExport.length} brand color styles directly to Figma file variables!`
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || String(err)
    };
  }
}
