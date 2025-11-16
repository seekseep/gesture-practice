interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
}

export class DraggableRectangle {
  private rectangles: Rectangle[] = [];
  private draggedRect: Rectangle | null = null;
  private offsetX = 0;
  private offsetY = 0;
  private isPinching = false;
  private handX = 0;
  private handY = 0;
  private isClosed = false;
  private score = 0;
  private scoredRects = new Set<Rectangle>();

  constructor(private canvas: HTMLCanvasElement) {
    this.setupEventListeners();
    // 左半分に4つの四角形を配置
    this.addRectangle(50, 50, 120, 120, '#4CAF50');
    this.addRectangle(50, 200, 120, 120, '#2196F3');
    this.addRectangle(50, 350, 120, 120, '#FF9800');
    this.addRectangle(50, 500, 120, 120, '#E91E63');
  }

  private setupEventListeners() {
    this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
  }

  addRectangle(x: number, y: number, width: number, height: number, color: string) {
    this.rectangles.push({ x, y, width, height, color });
  }

  private isPointInRect(px: number, py: number, rect: Rectangle): boolean {
    return px >= rect.x && px <= rect.x + rect.width &&
           py >= rect.y && py <= rect.y + rect.height;
  }

  private onMouseDown(e: MouseEvent) {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    for (let i = this.rectangles.length - 1; i >= 0; i--) {
      if (this.isPointInRect(x, y, this.rectangles[i])) {
        this.draggedRect = this.rectangles[i];
        this.offsetX = x - this.draggedRect.x;
        this.offsetY = y - this.draggedRect.y;
        break;
      }
    }
  }

  private onMouseMove(e: MouseEvent) {
    if (this.draggedRect) {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      this.draggedRect.x = x - this.offsetX;
      this.draggedRect.y = y - this.offsetY;
    }
  }

  private onMouseUp() {
    this.draggedRect = null;
  }

  updateHandPosition(x: number, y: number, isPinching: boolean, isClosed: boolean = false) {
    this.handX = x;
    this.handY = y;
    this.isClosed = isClosed;

    if (isPinching && !this.isPinching) {
      // ピンチ開始
      for (let i = this.rectangles.length - 1; i >= 0; i--) {
        if (this.isPointInRect(x, y, this.rectangles[i])) {
          this.draggedRect = this.rectangles[i];
          this.offsetX = x - this.draggedRect.x;
          this.offsetY = y - this.draggedRect.y;
          break;
        }
      }
    } else if (!isPinching && this.isPinching) {
      // ピンチ終了 - スコアチェック
      if (this.draggedRect) {
        this.checkScore(this.draggedRect);
      }
      this.draggedRect = null;
    } else if (isPinching && this.draggedRect) {
      // ドラッグ中
      this.draggedRect.x = x - this.offsetX;
      this.draggedRect.y = y - this.offsetY;
    }

    this.isPinching = isPinching;
  }

  private checkScore(rect: Rectangle) {
    const rectCenterX = rect.x + rect.width / 2;
    const canvasHalfWidth = this.canvas.width / 2;

    // 右半分に移動し、まだスコアを獲得していない場合
    if (rectCenterX > canvasHalfWidth && !this.scoredRects.has(rect)) {
      this.score += 25;
      this.scoredRects.add(rect);
    }
  }

  getScore(): number {
    return this.score;
  }

  draw(ctx: CanvasRenderingContext2D) {
    for (const rect of this.rectangles) {
      // 掴まれている時は色を変える
      const isDragged = this.draggedRect === rect && this.isPinching;
      ctx.fillStyle = isDragged ? '#FFD700' : rect.color;
      ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
      ctx.strokeStyle = isDragged ? '#FF6B00' : '#333';
      ctx.lineWidth = isDragged ? 4 : 2;
      ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
    }

    // 掴まれている時に線を描画
    if (this.draggedRect && this.isPinching) {
      const rectCenterX = this.draggedRect.x + this.draggedRect.width / 2;
      const rectCenterY = this.draggedRect.y + this.draggedRect.height / 2;

      // 手が閉じているかどうかで線の色を変える
      ctx.strokeStyle = this.isClosed ? '#FF0000' : '#FF00FF';
      ctx.lineWidth = 3;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(this.handX, this.handY);
      ctx.lineTo(rectCenterX, rectCenterY);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // スコアを表示
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 32px Arial';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.strokeText(`スコア: ${this.score}`, 20, 50);
    ctx.fillText(`スコア: ${this.score}`, 20, 50);
  }
}
