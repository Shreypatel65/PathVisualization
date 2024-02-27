import json
import time
import heapq
import asyncio
from queue import PriorityQueue
from channels.generic.websocket import AsyncWebsocketConsumer

class PathConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        await self.accept()

    async def disconnect(self, close_code):
        pass

    async def receive(self, text_data):
        text_data_json = json.loads(text_data)
        message_type = text_data_json.get('type')
        if message_type == 'path.dijkstra':
            await self.path_dijkstra(text_data_json.get('grid'))
        elif message_type == 'path.astar':
            await self.path_astar(text_data_json.get('grid'))

    def preprocess_grid(self, grid):
        start = None
        end = None
        for i in range(len(grid)):
            for j in range(len(grid[i])):
                if grid[i][j] not in [0, 1, 2, 3]:
                    grid[i][j] = 0
                elif grid[i][j] == 2:
                    if start is None:
                        start = (i, j)
                    else:
                        raise ValueError("More than one start point found.")
                elif grid[i][j] == 3:
                    if end is None:
                        end = (i, j)
                    else:
                        raise ValueError("More than one end point found.")
        if start is None or end is None:
            raise ValueError("Start point and end point must be specified.")
        return start, end
    

    async def path_dijkstra(self, grid):
        start_time = time.time()
        start, end = self.preprocess_grid(grid)

        directions = [(0, 1), (0, -1), (1, 0), (-1, 0)]
        heap = [(0, start, [])]
        visited = set()
        while heap:
            (cost, (x, y), path) = heapq.heappop(heap)
            if (x, y) in visited:
                continue
            path = path + [(x, y)]
            if (x, y) == end:
                path.remove(start)
                path.remove(end)
                end_time = time.time()
                await self.send(text_data=json.dumps({'cost': cost-1, 'grid': grid, 'time': end_time - start_time, 'close' : True, 'path': path}))
                return
            visited.add((x, y))
            if start != (x, y):
                await self.send(text_data=json.dumps({'color': 5, 'x': x, 'y': y, 'close' : False}))
            for dx, dy in directions:
                nx, ny = x + dx, y + dy
                if (0 <= nx < len(grid) and 0 <= ny < len(grid[0]) and
                    grid[nx][ny] != 1 and (nx, ny) not in visited):
                    heapq.heappush(heap, (cost + 1, (nx, ny), path))
                    if end != (nx, ny):
                        await asyncio.sleep(0.01564)
                        await self.send(text_data=json.dumps({'color': 6, 'x': nx, 'y': ny, 'close' : False}))

        end_time = time.time()
        await self.send(text_data=json.dumps({'cost': -1, 'grid': grid, 'time': end_time - start_time, 'close' : True}))


        
    async def heuristic(self, a, b):
        return abs(a[0] - b[0]) + abs(a[1] - b[1])
    
    async def path_astar(self, grid):
        start, end = self.preprocess_grid(grid)

        path = []
        count = 0
        open_set = PriorityQueue()
        open_set.put((0, count, start))
        came_from = {}
        g_score = {(row,col): float("inf") for row in range(len(grid)) for col in range(len(grid[0]))}
        g_score[start] = 0
        f_score = {(row,col): float("inf") for row in range(len(grid)) for col in range(len(grid[0]))}
        f_score[start] = await self.heuristic(start, end)

        open_set_hash = {start}
        
        
        while not open_set.empty():
        #For Quiting the code
            current = open_set.get()[2]
            if current != start and current != end:
                await asyncio.sleep(0.0156)
                await self.send(text_data=json.dumps({'color': 5, 'x': current[0], 'y': current[1], 'close' : False}))
            open_set_hash.remove(current)

            if current == end:
                while current in came_from:
                    path.append(current)
                    current = came_from[current]
                else:
                        print("Distance from origin is {}".format(len(path)))
                        path.remove(end)
                await self.send(text_data=json.dumps({'cost': len(path), 'path': path, 'close' : True}))
                return

            neighbours = []
            x = current[0]
            y = current[1]
            if y > 0 and grid[x][y - 1] != 1:#Top
                neighbours.append((x,y - 1))
            if x < len(grid) - 1 and grid[x + 1][y] != 1: #right
                neighbours.append((x + 1,y))
            if y < len(grid[0]) - 1 and grid[x][y + 1] != 1: #Bottom
                neighbours.append((x,y + 1))
            if x > 0 and grid[x-1][y] != 1:#Left 
                neighbours.append((x - 1,y))

            for neighbor in neighbours:
                temp_g_score = g_score[current] + 1
                if temp_g_score < g_score[neighbor]:
                    came_from[neighbor] = current
                    g_score[neighbor] = temp_g_score
                    f_score[neighbor] = temp_g_score + await self.heuristic(neighbor, end)
                    if neighbor not in open_set_hash:
                        count += 1
                        open_set.put((f_score[neighbor], count, neighbor))
                        open_set_hash.add(neighbor)
                        if neighbor != end:
                            await asyncio.sleep(0.0157)
                            await self.send(text_data=json.dumps({'color': 6, 'x': neighbor[0], 'y': neighbor[1], 'close' : False}))

        else:
            await self.send(text_data=json.dumps({'cost': -1, 'path': 'i', 'close' : True}))