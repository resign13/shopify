"""Customer-scoped order pagination; count and items share one request snapshot."""
from datetime import datetime


def page(db, user_id, args):
    number, size = int(args.get('page', 1)), int(args.get('pageSize', 25))
    if number < 1 or size not in {25, 50, 100}:
        raise ValueError('Invalid pagination')
    conditions, params = ['o.store_user_id=%s'], [user_id]
    status = args.get('status', 'all')
    if status != 'all':
        if status not in {'pending_payment', 'allocated', 'paid', 'shipped', 'completed', 'cancelled'}:
            raise ValueError('Invalid order status')
        conditions.append('o.status=%s')
        params.append(status)
    for key, operator in [('dateFrom', '>='), ('dateTo', '<')]:
        if args.get(key):
            value = datetime.fromisoformat(args[key].replace('Z', '+00:00'))
            if value.tzinfo is None:
                raise ValueError('Date must include a timezone')
            conditions.append(f'o.created_at {operator} %s')
            params.append(value)
    keyword = args.get('q', '').strip().lower()
    if len(keyword) > 200:
        raise ValueError('Search is limited to 200 characters')
    if keyword:
        # strpos treats %, _ and backslashes as literal search characters.
        conditions.append("""strpos(lower(concat_ws(' ',o.order_no,o.contact_name,
          o.contact_email,o.phone,o.country,o.shipping_address,o.note,
          (SELECT string_agg(concat_ws(' ',i.product_name,t.name,i.sku,i.size_code),' ')
           FROM order_items i LEFT JOIN product_translations t
             ON t.product_id=i.product_id AND t.lang_code='en'
           WHERE i.order_id=o.id))),%s)>0""")
        params.append(keyword)
    where = ' AND '.join(conditions)
    total = db._fetch_one('SELECT count(*) AS n FROM orders o WHERE ' + where, tuple(params))['n']
    number = min(number, max(1, (total + size - 1)//size))
    ids = [row['id'] for row in db._fetch_all('SELECT o.id FROM orders o WHERE ' + where +
        ' ORDER BY o.id DESC LIMIT %s OFFSET %s', (*params, size, (number-1)*size))]
    return {'items': db.list_orders(user_id=user_id, order_ids=ids),
            'total': total, 'page': number, 'pageSize': size}
