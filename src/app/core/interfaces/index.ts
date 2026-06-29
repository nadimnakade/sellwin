export interface DashboardStats {
  ordersToday: number;
  revenueToday: number;
  activeCarts: number;
  latestCarts: number;
}

export interface Order {
  id: number;
  orderNumber: string;
  customerName: string;
  mobile: string;
  email: string;
  total: number;
  status: string;
  dateCreated: string;
  paymentMethod: string;
  currency: string;
}

export interface OrderDetail {
  id: number;
  orderNumber: string;
  status: string;
  currency: string;
  dateCreated: string;
  datePaid: string;
  paymentMethod: string;
  customer: {
    name: string;
    mobile: string;
    email: string;
  };
  billing: Address;
  shipping: Address;
  products: OrderItem[];
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  shippingTotal: number;
  total: number;
  note: string;
}

export interface Address {
  firstName: string;
  lastName: string;
  mobile: string;
  email: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
}

export interface OrderItem {
  productId: number;
  name: string;
  sku: string;
  quantity: number;
  price: number;
  subtotal: number;
  image: string;
  imageBase64: string | null;
}

export interface ActiveCart {
  id: number;
  mobile: string;
  name: string;
  products: number;
  cartValue: number;
  lastActivity: string;
  lastActivityAgo: string;
  cartData: CartProduct[];
}

export interface AbandonedCart {
  id: number;
  mobile: string;
  name: string;
  products: number;
  cartValue: number;
  lastActivity: string;
  abandonedSince: string;
  cartData: CartProduct[];
}

export interface CartProduct {
  product_id: number;
  product_name: string;
  quantity: number;
  price: number;
  subtotal: number;
}

export interface CustomerHistory {
  mobile: string;
  name: string;
  email: string;
  events: any[];
  carts: any[];
  orders: CustomerOrder[];
  lifetimeValue: number;
  productsViewed: number;
}

export interface CustomerOrder {
  id: number;
  total: number;
  status: string;
  date: string;
}

export interface RevenueTrend {
  date: string;
  revenue: number;
}

export interface OrdersTrend {
  date: string;
  orders: number;
}

export interface AbandonedTrend {
  date: string;
  carts: number;
}

export interface TopProduct {
  productId: number;
  name: string;
  image: string;
  price: number;
  orderCount: number;
}

export interface AuthUser {
  authenticated: boolean;
  user?: {
    id: number;
    username: string;
    roles: string[];
  };
  message?: string;
}

export interface PaginatedResponse<T> {
  orders: T[];
  total: number;
  page: number;
  perPage: number;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthToken {
  token: string;
  user_email: string;
  user_nicename: string;
  user_display_name: string;
}
