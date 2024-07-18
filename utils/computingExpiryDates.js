const calculateSubscriptionEndDate = (plan) => {
    const now = new Date();
    switch (plan) {
        case 'monthly':
            now.setMonth(now.getMonth() + 1);
            break;
        case 'quarterly':
            now.setMonth(now.getMonth() + 3);
            break;
        case 'yearly':
            now.setFullYear(now.getFullYear() + 1);
            break;
        default:
            throw new Error('Unknown subscription plan');
    }
    return now;
};

module.exports = calculateSubscriptionEndDate;