import { randomUUID } from 'node:crypto';
import { Database } from './database.js';
import { buildRoutePath } from './utils/build-route-path.js';
import { parse } from 'csv-parse';
import fs from 'node:fs';

const csvPath = new URL('../tasks.csv', import.meta.url);

const database = new Database();

export const routes = [
  {
    method: 'GET',
    path: buildRoutePath('/tasks'),
    handler: (req, res) => {
      const { search } = req.query;

      const tasks = database.select('tasks', search ? {
        title: decodeURIComponent(search),
        description: decodeURIComponent(search)
      } : null);
    
      return res
        .end(JSON.stringify(tasks));
    }
  },
  {
    method: 'POST',
    path: buildRoutePath('/tasks'),
    handler: (req, res) => {
      const { title, description } = req.body;
      const task = {
        id: randomUUID(),
        title,
        description,
        created_at: new Date(),
        updated_at: null,
        completed_at: null,
      };

      database.insert('tasks', task);

      return res.writeHead(201).end();
    }
  },
  {
    method: 'POST',
    path: buildRoutePath('/tasks/import'),
    handler: async (req, res) => {
      const tasks = [];

     fs.createReadStream(csvPath)
      .pipe(parse({ delimiter: ',', columns: true, ltrim: true }))
      .on('data', row => {
        tasks.push(row);
      })
      .on('error', error => {
        console.log(error.message);
      })
      .on('end', () => {
        tasks.forEach(task => {
          const { title, description } = task;
  
          const newTask = {
            id: randomUUID(),
            title,
            description,
            created_at: new Date(),
            updated_at: null,
            completed_at: null,
          };
    
          database.insert('tasks', newTask);
        });
  
        return res.writeHead(201).end();
      })
    }
  },
  {
    method: 'PUT',
    path: buildRoutePath('/tasks/:id'),
    handler: (req, res) => {
      const { id } = req.params;
      const { title, description } = req.body;
      const updated_at = new Date();

      const task = database.findOne('tasks', id);

      if (!task) {
        res.writeHead(404, { "Content-Type": "text/plain" });
        return res.end('Task não encontrada.');
      }
      
      if (title && description) {
        database.update('tasks', id, { ...task, title, description, updated_at });
      } else if (title) {
        database.update('tasks', id, { ...task, title, updated_at });
      } else {
        database.update('tasks', id, { ...task, description, updated_at });
      }

      return res.writeHead(204).end()
    }
  },
  {
    method: 'PATCH',
    path: buildRoutePath('/tasks/:id/complete'),
    handler: (req, res) => {
      const { id } = req.params;
      const completed_at = new Date();

      const task = database.findOne('tasks', id);

      if(!task) {
        res.writeHead(404, { "Content-Type": "text/plain" });
        return res.end('Task não encontrada.'); 
      }
      
      database.update('tasks', id, { ...task, completed_at, updated_at: completed_at });
      return res.writeHead(204).end()
    }
  },
  {
    method: 'DELETE',
    path: buildRoutePath('/tasks/:id'),
    handler: (req, res) => {
      const { id } = req.params;

      const task = database.findOne('tasks', id);

      if(!task) {
        res.writeHead(404, { "Content-Type": "text/plain" });
        return res.end('Task não encontrada.');
      }

      database.delete('tasks', id);
      return res.writeHead(204).end()
    }
  }
]