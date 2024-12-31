# Jagura

![Jagura Logo](<app-image>)

**Jagura** is an SQL interface for managing containers. This project acts like a traditional SQL database with standard SQL syntax but introduces a new type, `container`, with functions like `START`, `STOP`, `KILL`, `RESTART`, `PAUSE`, and `RESUME`.

## Getting Started

### Prerequisites

To run this project, ensure you have the following:

1. **Paddock (this project)**  
Clone this repository and run:  
```bash
npm install
```

2. Paddock-Frontend (other project)
Clone the frontend repository and run:
```bash
npm install
```

3. Docker Desktop
Ensure Docker Desktop is running in the background.

4. Docker Images
Pull the necessary Docker images for the containers, for exmaple:

```
docker pull alpine  
docker pull nginx
```

## Running the Application

#### 1. Start the server:
In the Paddock project directory, run: 
```
npm run start:api
```

#### 2.Start the frontend
In the Paddock-Frontend directory, run:
```
npm run dev
```
This will usually run on http://localhost:5173/.


#### 3.Ensure Docker Desktop is running
Run the Docker Desktop app in the background.

#### 4.Prepare Images
Pull Docker images as required (e.g., Alpine, Nginx, Ubuntu, etc.).

## SQL Examples
Creating a Table:
```sql
CREATE TABLE tablename (id NUMBER, name STRING, app CONTAINER);
```
Adding Records:
```sql
INSERT INTO tablename VALUES (2, 'aaaa', 'imgs/alpine.json');
```
Note: The app works with JSON files that define the image (e.g., files in the /imgs folder).

## Supported SQL Functions
### General Functions:

#### SUM: Aggregate numeric values.
Example:

```sql
SELECT SUM(id) FROM tablename;
```
#### COUNT: count rows
Example:

```sql
SELECT COUNT(*) FROM tablename;
```

#### LENGTH: Get the length of string values.
Example:

```sql
SELECT LENGTH(name) FROM tablename;
```

### Container-Specific Functions:
#### START/STOP/KILL/PAUSE/RESUME/RESTART: Manage container lifecycle.
Examples:

```sql
SELECT START(app) FROM tablename;
-- or:
SELECT STOP(app) FROM tablename WHERE id = 2;
```

#### METADATA: Fetch container metadata.
Example:

```sql
SELECT METADATA(app) FROM tablename;
--or if u want to extract certain field from metadata:
SELECT METADATA(app, 'status') FROM tablename;
```

#### RUN_CMD: Execute commands inside a container.
Example:

```sql
SELECT RUN_CMD(app, 'ls -la') FROM tablename WHERE id = 4;
```

## Sample Scenario
### Create and Manage an Alpine Container"
Create a table:

```sql
CREATE TABLE t1 (id NUMBER, c CONTAINER);
```
Insert a record:

```sql
INSERT INTO t1 VALUES (3, 'imgs/alpine.json');
```

Start the container:
```sql
SELECT START(c) FROM t1 WHERE id = 3;
```
Install curl on Alpine:

```sql
SELECT RUN_CMD(c, "apk add --no-cache curl") FROM t1 WHERE id = 3;
```

Run an API request from within the container:

```sql
SELECT RUN_CMD(c, "curl -s https://dragonball-api.com/api/characters/2") FROM t1 WHERE id = 3;
```

Extract a specific key from the response:
```sql

SELECT RUN_CMD(c, "curl -s https://dragonball-api.com/api/characters/2", 'name') FROM t1 WHERE id = 3;
```

Combine metadata and other details:

```sql
SELECT RUN_CMD(c, "curl -s https://dragonball-api.com/api/characters/2", 'name'), id, METADATA(c) FROM t1 WHERE id = 3;
```


## Additional Features

### Use wildcards like in any SQL query:
```sql
SELECT * FROM tablename;
```

#### In the frontend, you can highlight a specific SQL row and execute it just like in any SQL editor.


