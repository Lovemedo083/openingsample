import { PlacedItem, RoomDimensions } from '../types';

/**
 * Checks if two rectangles overlap
 */
export const checkCollision = (rect1: PlacedItem, rect2: PlacedItem): boolean => {
  return (
    rect1.x < rect2.x + rect2.width &&
    rect1.x + rect1.width > rect2.x &&
    rect1.y < rect2.y + rect2.depth && // Depth is mapped to Height in 2D top-down view
    rect1.y + rect1.depth > rect2.y
  );
};

/**
 * Checks if item is within room boundaries
 */
export const checkWallValidation = (item: PlacedItem, room: RoomDimensions): boolean => {
  const isOutside =
    item.x < 0 ||
    item.y < 0 ||
    item.x + item.width > room.width ||
    item.y + item.depth > room.depth;

  // Simple check for door blocking (if item overlaps door area on bottom wall)
  // Door is on the bottom wall (y = room.depth)
  const doorStart = room.doorX;
  const doorEnd = room.doorX + room.doorWidth;
  
  const itemStart = item.x;
  const itemEnd = item.x + item.width;
  
  // If item is touching the bottom wall
  const isTouchingBottom = item.y + item.depth >= room.depth - 5; // 5cm buffer
  
  const blocksDoor = isTouchingBottom && !(itemEnd < doorStart || itemStart > doorEnd);

  return isOutside || blocksDoor;
};

/**
 * Runs full validation on all items
 */
export const validateLayout = (items: PlacedItem[], room: RoomDimensions): PlacedItem[] => {
  return items.map((item, index) => {
    let isCollision = false;
    let isWallViolation = false;
    const warnings: string[] = [];

    // Check collision with other items
    for (let i = 0; i < items.length; i++) {
      if (i === index) continue;
      if (checkCollision(item, items[i])) {
        isCollision = true;
        warnings.push('타 물품과 겹칩니다.');
        break; 
      }
    }

    // Check wall/door validation
    if (checkWallValidation(item, room)) {
      isWallViolation = true;
      warnings.push('벽을 넘거나 문을 막고 있습니다.');
    }

    // Check clearance (simplified: check if facing wall is too close)
    // Assuming 'front' is facing 'down' (+Y) for simplicity in this MVP
    if (item.clearance.front > 0) {
      if (item.y + item.depth + item.clearance.front > room.depth) {
        warnings.push(`전면 여유공간 ${item.clearance.front}cm가 부족합니다.`);
      }
    }

    return { ...item, isCollision, isWallViolation, warnings };
  });
};
