import { db } from '../server/db';
import { endpointCategories, apiEndpoints } from '../shared/schema';
import { eq } from 'drizzle-orm';

/**
 * Initializes the database with sample data for testing
 */
async function initializeDatabase() {
  console.log('Initializing database with sample data...');

  // First check if data already exists to avoid duplicates
  const existingCategories = await db.select().from(endpointCategories);

  if (existingCategories.length > 0) {
    console.log('Database already initialized. Exiting.');
    return;
  }

  // Add sample categories
  const [mineralsCategory] = await db.insert(endpointCategories).values({
    name: 'Minerals',
    description: 'Endpoints for accessing mineral data'
  }).returning();

  const [locationsCategory] = await db.insert(endpointCategories).values({
    name: 'Locations',
    description: 'Endpoints for accessing location data'
  }).returning();

  const [imagesCategory] = await db.insert(endpointCategories).values({
    name: 'Images',
    description: 'Endpoints for accessing image data'
  }).returning();

  // Add sample endpoints
  await db.insert(apiEndpoints).values([
    {
      path: '/minerals',
      method: 'GET',
      summary: 'List all minerals',
      description: 'Returns a paginated list of minerals in the database',
      parameters: JSON.stringify([
        {
          name: 'page',
          in: 'query',
          required: false,
          type: 'integer',
          description: 'Page number for pagination'
        },
        {
          name: 'limit',
          in: 'query',
          required: false,
          type: 'integer',
          description: 'Number of items per page'
        }
      ]),
      responses: JSON.stringify({
        '200': {
          description: 'Successful operation'
        },
        '400': {
          description: 'Invalid parameters'
        }
      }),
      categoryId: mineralsCategory.id
    },
    {
      path: '/minerals/{id}',
      method: 'GET',
      summary: 'Get mineral by ID',
      description: 'Returns detailed information about a specific mineral',
      parameters: JSON.stringify([
        {
          name: 'id',
          in: 'path',
          required: true,
          type: 'integer',
          description: 'Mineral ID'
        }
      ]),
      responses: JSON.stringify({
        '200': {
          description: 'Successful operation'
        },
        '404': {
          description: 'Mineral not found'
        }
      }),
      categoryId: mineralsCategory.id
    },
    {
      path: '/locations',
      method: 'GET',
      summary: 'List all locations',
      description: 'Returns a paginated list of locations in the database',
      parameters: JSON.stringify([
        {
          name: 'page',
          in: 'query',
          required: false,
          type: 'integer',
          description: 'Page number for pagination'
        },
        {
          name: 'limit',
          in: 'query',
          required: false,
          type: 'integer',
          description: 'Number of items per page'
        }
      ]),
      responses: JSON.stringify({
        '200': {
          description: 'Successful operation'
        },
        '400': {
          description: 'Invalid parameters'
        }
      }),
      categoryId: locationsCategory.id
    },
    {
      path: '/locations/{id}',
      method: 'GET',
      summary: 'Get location by ID',
      description: 'Returns detailed information about a specific location',
      parameters: JSON.stringify([
        {
          name: 'id',
          in: 'path',
          required: true,
          type: 'integer',
          description: 'Location ID'
        }
      ]),
      responses: JSON.stringify({
        '200': {
          description: 'Successful operation'
        },
        '404': {
          description: 'Location not found'
        }
      }),
      categoryId: locationsCategory.id
    },
    {
      path: '/images',
      method: 'GET',
      summary: 'List all images',
      description: 'Returns a paginated list of mineral images',
      parameters: JSON.stringify([
        {
          name: 'page',
          in: 'query',
          required: false,
          type: 'integer',
          description: 'Page number for pagination'
        },
        {
          name: 'limit',
          in: 'query',
          required: false,
          type: 'integer',
          description: 'Number of items per page'
        }
      ]),
      responses: JSON.stringify({
        '200': {
          description: 'Successful operation'
        },
        '400': {
          description: 'Invalid parameters'
        }
      }),
      categoryId: imagesCategory.id
    }
  ]);

  console.log('Database initialized successfully!');
  process.exit(0);
}

// Run the initialization
initializeDatabase().catch(error => {
  console.error('Error initializing database:', error);
  process.exit(1);
});