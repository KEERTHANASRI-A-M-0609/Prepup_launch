def get_opportunities(probability):

    if probability >= 80:
        return {
            "safe": ["TCS", "Infosys"],
            "target": ["PayPal", "Zoho"],
            "stretch": ["Google", "Microsoft"]
        }

    elif probability >= 60:
        return {
            "safe": ["Cognizant", "Accenture"],
            "target": ["TCS", "Infosys"],
            "stretch": ["PayPal"]
        }

    return {
        "safe": ["Local Startups"],
        "target": ["Cognizant"],
        "stretch": ["TCS"]
    }