import { Request, Response, NextFunction } from 'express';

// stubs - real implementations exist in orderService.ts
// these are just here so the route file compiles and swagger can scan it

export const createOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // TODO: wire up to orderService.create()
    res.status(201).json({ message: 'stub' });
  } catch (err) {
    next(err);
  }
};

export const getOrderById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Hack: mongoose ObjectId validation throws synchronously, not as a promise rejection,
    // so we have to catch it here or it blows up the error handler with an unhelpful message
    const { id } = req.params;
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ error: 'Invalid order ID format' });
    }
    res.json({ message: 'stub', id });
  } catch (err) {
    next(err);
  }
};

export const listOrders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } });
  } catch (err) {
    next(err);
  }
};

export const updateOrderStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ message: 'stub' });
  } catch (err) {
    next(err);
  }
};

export const cancelOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
