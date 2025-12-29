import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import prisma from '../models/prisma.js';
import jwt from 'jsonwebtoken';

const router = Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2024-12-18.acacia',
});

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// Price IDs from Stripe
const PRICES = {
    PRO: process.env.STRIPE_PRICE_PRO || 'price_pro',
    ENTERPRISE: process.env.STRIPE_PRICE_ENTERPRISE || 'price_enterprise',
};

// Middleware to verify auth
const requireAuth = async (req: Request, res: Response, next: Function) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Authorization required' });
        }

        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
        (req as any).userId = decoded.userId;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
    }
};

// POST /api/billing/create-checkout - Create Stripe checkout session
router.post('/create-checkout', requireAuth, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        const { tier } = req.body;

        if (!tier || !['PRO', 'ENTERPRISE'].includes(tier)) {
            return res.status(400).json({ error: 'Invalid tier' });
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Get or create Stripe customer
        let customerId = user.stripeCustomerId;
        if (!customerId) {
            const customer = await stripe.customers.create({
                email: user.email,
                name: user.name || undefined,
                metadata: { userId: user.id },
            });
            customerId = customer.id;

            await prisma.user.update({
                where: { id: userId },
                data: { stripeCustomerId: customerId },
            });
        }

        // Create checkout session
        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            mode: 'subscription',
            line_items: [
                {
                    price: PRICES[tier as keyof typeof PRICES],
                    quantity: 1,
                },
            ],
            success_url: `${FRONTEND_URL}/settings?success=true`,
            cancel_url: `${FRONTEND_URL}/pricing?canceled=true`,
            metadata: { userId, tier },
        });

        res.json({ url: session.url });
    } catch (error) {
        console.error('Checkout error:', error);
        res.status(500).json({ error: 'Failed to create checkout session' });
    }
});

// POST /api/billing/portal - Create billing portal session
router.post('/portal', requireAuth, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;

        const user = await prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user?.stripeCustomerId) {
            return res.status(400).json({ error: 'No billing account found' });
        }

        const session = await stripe.billingPortal.sessions.create({
            customer: user.stripeCustomerId,
            return_url: `${FRONTEND_URL}/settings`,
        });

        res.json({ url: session.url });
    } catch (error) {
        console.error('Portal error:', error);
        res.status(500).json({ error: 'Failed to create portal session' });
    }
});

// POST /api/billing/webhook - Stripe webhook handler
router.post('/webhook', async (req: Request, res: Response) => {
    const sig = req.headers['stripe-signature'] as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
        return res.status(500).json({ error: 'Webhook secret not configured' });
    }

    let event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
        console.error('Webhook signature verification failed:', err);
        return res.status(400).json({ error: 'Invalid signature' });
    }

    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object as Stripe.Checkout.Session;
                const { userId, tier } = session.metadata || {};

                if (userId && tier && session.subscription) {
                    const subscription = await stripe.subscriptions.retrieve(
                        session.subscription as string
                    );

                    await prisma.$transaction([
                        prisma.subscription.create({
                            data: {
                                userId,
                                stripeSubscriptionId: subscription.id,
                                stripePriceId: subscription.items.data[0].price.id,
                                status: 'ACTIVE',
                                currentPeriodStart: new Date(subscription.current_period_start * 1000),
                                currentPeriodEnd: new Date(subscription.current_period_end * 1000),
                            },
                        }),
                        prisma.user.update({
                            where: { id: userId },
                            data: { tier: tier as 'PRO' | 'ENTERPRISE' },
                        }),
                    ]);
                }
                break;
            }

            case 'customer.subscription.updated': {
                const subscription = event.data.object as Stripe.Subscription;

                await prisma.subscription.updateMany({
                    where: { stripeSubscriptionId: subscription.id },
                    data: {
                        status: subscription.status.toUpperCase() as any,
                        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
                        cancelAtPeriodEnd: subscription.cancel_at_period_end,
                    },
                });
                break;
            }

            case 'customer.subscription.deleted': {
                const subscription = event.data.object as Stripe.Subscription;

                const sub = await prisma.subscription.findFirst({
                    where: { stripeSubscriptionId: subscription.id },
                });

                if (sub) {
                    await prisma.$transaction([
                        prisma.subscription.update({
                            where: { id: sub.id },
                            data: { status: 'CANCELED' },
                        }),
                        prisma.user.update({
                            where: { id: sub.userId },
                            data: { tier: 'FREE' },
                        }),
                    ]);
                }
                break;
            }
        }

        res.json({ received: true });
    } catch (error) {
        console.error('Webhook processing error:', error);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
});

// GET /api/billing/subscription - Get current subscription
router.get('/subscription', requireAuth, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;

        const subscription = await prisma.subscription.findFirst({
            where: {
                userId,
                status: 'ACTIVE',
            },
            orderBy: { createdAt: 'desc' },
        });

        res.json(subscription);
    } catch (error) {
        console.error('Error fetching subscription:', error);
        res.status(500).json({ error: 'Failed to fetch subscription' });
    }
});

export default router;
